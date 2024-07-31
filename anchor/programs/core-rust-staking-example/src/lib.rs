use anchor_lang::prelude::*;
use mpl_core::{
    ID as CORE_PROGRAM_ID,
    fetch_plugin,
    accounts::{BaseAssetV1, BaseCollectionV1}, 
    instructions::{AddPluginV1CpiBuilder, RemovePluginV1CpiBuilder, UpdatePluginV1CpiBuilder}, 
    types::{Attribute, Attributes, FreezeDelegate, Plugin, PluginAuthority, PluginType, UpdateAuthority}, 
};

declare_id!("4T8mkjxRH1S8ntrAGavdtBPy2N8iQd74G2iyCrAU32NQ");

#[program]
pub mod core_rust_staking_example {
    use super::*; 

    pub fn stake(ctx: Context<Stake>) -> Result<()> {  
        // Check if the asset has the attribute plugin already on
        match fetch_plugin::<BaseAssetV1, Attributes>(&ctx.accounts.asset.to_account_info(), mpl_core::types::PluginType::Attributes) {
            Ok((_, fetched_attribute_list, _)) => {
                // If yes, check if the asset is already staked, and if the staking attribute are already initialized
                let mut attribute_list: Vec<Attribute> = Vec::new();
                let mut is_initialized: bool = false;

                for attribute in fetched_attribute_list.attribute_list {
                    if attribute.key == "staked" {
                        require!(attribute.value == "0", StakingError::AlreadyStaked);
                        attribute_list.push(Attribute { key: "staked".to_string(), value: Clock::get()?.unix_timestamp.to_string() });
                        is_initialized = true;
                    } else {
                        attribute_list.push(attribute);
                    } 
                }

                if !is_initialized {
                    attribute_list.push(Attribute { key: "staked".to_string(), value: Clock::get()?.unix_timestamp.to_string() });
                    attribute_list.push(Attribute { key: "staked_time".to_string(), value: 0.to_string() });
                }

                UpdatePluginV1CpiBuilder::new(&ctx.accounts.core_program.to_account_info())
                .asset(&ctx.accounts.asset.to_account_info())
                .collection(Some(&ctx.accounts.collection.to_account_info()))
                .payer(&ctx.accounts.payer.to_account_info())
                .authority(Some(&ctx.accounts.update_authority.to_account_info()))
                .system_program(&ctx.accounts.system_program.to_account_info())
                .plugin(Plugin::Attributes(Attributes{ attribute_list }))
                .invoke()?;
            }
            Err(_) => {
                // If not, add the attribute plugin to the asset
                AddPluginV1CpiBuilder::new(&ctx.accounts.core_program.to_account_info())
                .asset(&ctx.accounts.asset.to_account_info())
                .collection(Some(&ctx.accounts.collection.to_account_info()))
                .payer(&ctx.accounts.payer.to_account_info())
                .authority(Some(&ctx.accounts.update_authority.to_account_info()))
                .system_program(&ctx.accounts.system_program.to_account_info())
                .plugin(Plugin::Attributes(
                    Attributes{ 
                        attribute_list: vec![
                            Attribute { key: "staked".to_string(), value: Clock::get()?.unix_timestamp.to_string() },
                            Attribute { key: "staked_time".to_string(), value: 0.to_string() },
                        ] 
                    }
                ))
                .init_authority(PluginAuthority::UpdateAuthority)
                .invoke()?;
            }
        }

        // Freeze the asset  
        AddPluginV1CpiBuilder::new(&ctx.accounts.core_program.to_account_info())
        .asset(&ctx.accounts.asset.to_account_info())
        .collection(Some(&ctx.accounts.collection.to_account_info()))
        .payer(&ctx.accounts.payer.to_account_info())
        .authority(Some(&ctx.accounts.owner.to_account_info()))
        .system_program(&ctx.accounts.system_program.to_account_info())
        .plugin(Plugin::FreezeDelegate( FreezeDelegate{ frozen: true } ))
        .init_authority(PluginAuthority::UpdateAuthority)
        .invoke()?;

        Ok(())
    }

    pub fn unstake(ctx: Context<Unstake>) -> Result<()> {
        // Check if the asset has the attribute plugin already on
        match fetch_plugin::<BaseAssetV1, Attributes>(&ctx.accounts.asset.to_account_info(), mpl_core::types::PluginType::Attributes) {
            Ok((_, fetched_attribute_list, _)) => {
                let mut attribute_list: Vec<Attribute> = Vec::new();
                let mut is_initialized: bool = false;
                let mut staked_time: i64 = 0;

                for attribute in fetched_attribute_list.attribute_list.iter() {
                    if attribute.key == "staked" {
                        require!(attribute.value != "0", StakingError::NotStaked);
                        attribute_list.push(Attribute { key: "staked".to_string(), value: 0.to_string() });
                        staked_time = staked_time
                            .checked_add(Clock::get()?.unix_timestamp.checked_sub(attribute.value.parse::<i64>().map_err(|_| StakingError::InvalidTimestamp)?).ok_or(StakingError::Underflow)?)
                            .ok_or(StakingError::Overflow)?;
                        is_initialized = true;
                    } else if attribute.key == "staked_time" {
                        staked_time = staked_time
                            .checked_add(attribute.value.parse::<i64>().map_err(|_| StakingError::InvalidTimestamp)?)
                            .ok_or(StakingError::Overflow)?;
                    } else {
                        attribute_list.push(attribute.clone());
                    } 
                }

                attribute_list.push(Attribute { key: "staked_time".to_string(), value: staked_time.to_string() });

                require!(is_initialized, StakingError::StakingNotInitialized);


                UpdatePluginV1CpiBuilder::new(&ctx.accounts.core_program.to_account_info())
                .asset(&ctx.accounts.asset.to_account_info())
                .collection(Some(&ctx.accounts.collection.to_account_info()))
                .payer(&ctx.accounts.payer.to_account_info())
                .authority(Some(&ctx.accounts.update_authority.to_account_info()))
                .system_program(&ctx.accounts.system_program.to_account_info())
                .plugin(Plugin::Attributes(Attributes{ attribute_list }))
                .invoke()?;

            }
            Err(_) => {
                return Err(StakingError::AttributesNotInitialized.into());
            }
        }

        // Unfreeze the asset
        UpdatePluginV1CpiBuilder::new(&ctx.accounts.core_program.to_account_info())
        .asset(&ctx.accounts.asset.to_account_info())
        .collection(Some(&ctx.accounts.collection.to_account_info()))
        .payer(&ctx.accounts.payer.to_account_info())
        .authority(Some(&ctx.accounts.update_authority.to_account_info()))
        .system_program(&ctx.accounts.system_program.to_account_info())
        .plugin(Plugin::FreezeDelegate( FreezeDelegate{ frozen: false } ))
        .invoke()?;

        // Remove the FreezeDelegate Plugin
        RemovePluginV1CpiBuilder::new(&ctx.accounts.core_program)
        .asset(&ctx.accounts.asset.to_account_info())
        .collection(Some(&ctx.accounts.collection.to_account_info()))
        .payer(&ctx.accounts.payer)
        .authority(Some(&ctx.accounts.owner))
        .system_program(&ctx.accounts.system_program)
        .plugin_type(PluginType::FreezeDelegate)
        .invoke()?;
        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Stake<'info> {
    pub owner: Signer<'info>,
    pub update_authority: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        constraint = asset.owner == owner.key(),
        constraint = asset.update_authority == UpdateAuthority::Collection(collection.key()),
    )]
    pub asset: Account<'info, BaseAssetV1>,
    #[account(
        mut,
        constraint = collection.update_authority == update_authority.key(),
    )]
    pub collection: Account<'info, BaseCollectionV1>,
    #[account(address = CORE_PROGRAM_ID)]
    /// CHECK: this will be checked by core
    pub core_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Unstake<'info> {
    pub owner: Signer<'info>,
    pub update_authority: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        constraint = asset.owner == owner.key(),
        constraint = asset.update_authority == UpdateAuthority::Collection(collection.key()),
    )]
    pub asset: Account<'info, BaseAssetV1>,
    #[account(
        mut,
        constraint = collection.update_authority == update_authority.key(),
    )]
    pub collection: Account<'info, BaseCollectionV1>,
    #[account(address = CORE_PROGRAM_ID)]
    /// CHECK: this will be checked by core
    pub core_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum StakingError {
    #[msg("Invalid owner")]
    OwnerMismatched,
    #[msg("Invalid timestamp")]
    InvalidTimestamp,
    #[msg("Already staked")]
    AlreadyStaked,
    #[msg("Not staked")]
    NotStaked,
    #[msg("Staking not initialized")]
    StakingNotInitialized,
    #[msg("Attributes not initialized")]
    AttributesNotInitialized,


    #[msg("Underflow")]
    Underflow,
    #[msg("Overflow")]
    Overflow,
}