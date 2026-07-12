//! # Jingga Royalty Split Contract
//!
//! A Soroban smart contract for automatic royalty distribution on Stellar.
//!
//! ## Features
//! - Register split configurations with multiple recipients
//! - Execute automatic splits when payments are received
//! - Update split configurations (owner only)
//! - Query split history and distribution records
//! - Pause/reactivate splits
//!
//! ## Use Case
//! When a reader purchases access to a karya (written work), the payment
//! is automatically split among the author, editor, illustrator, and other
//! collaborators according to pre-configured percentages.

#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror,
    Address, Env, Map, Vec, Symbol, symbol_short,
    token, IntoVal, TryFromVal,
};

// ============================================================
// Data Types
// ============================================================

/// Error codes for the contract
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum RoyaltyError {
    /// Total percentage exceeds 100% (10000 basis points)
    TotalPercentageExceeded = 1,
    /// Split configuration already exists for this karya
    SplitAlreadyExists = 2,
    /// Split configuration not found
    SplitNotFound = 3,
    /// Only the original creator can perform this action
    Unauthorized = 4,
    /// No recipients configured for this split
    NoRecipients = 5,
    /// Invalid percentage value (must be > 0)
    InvalidPercentage = 6,
    /// Split is paused and cannot execute
    SplitPaused = 7,
    /// Payment amount must be positive
    InvalidAmount = 8,
    /// Duplicate recipient address
    DuplicateRecipient = 9,
}

/// A single recipient in a split configuration
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Recipient {
    /// Stellar address of the recipient
    pub wallet: Address,
    /// Percentage in basis points (e.g., 5000 = 50%, 2500 = 25%)
    pub percentage_bps: u32,
    /// Role identifier: "penulis", "editor", "ilustrator", "kolaborator"
    pub role: Symbol,
}

/// Split configuration for a karya
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SplitConfig {
    /// Unique identifier for the karya
    pub karya_id: Symbol,
    /// Creator/owner of this split (usually the main author)
    pub creator: Address,
    /// List of recipients with their percentages
    pub recipients: Vec<Recipient>,
    /// Total percentage in basis points (should = 10000 for 100%)
    pub total_percentage_bps: u32,
    /// Whether this split is currently active
    pub active: bool,
    /// Timestamp when this config was created
    pub created_at: u64,
}

/// Record of a single distribution event
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DistributionRecord {
    /// Timestamp of distribution
    pub timestamp: u64,
    /// Total amount distributed (in stroops, 1 XLM = 10^7 stroops)
    pub total_amount: i128,
    /// Map of recipient address -> amount received
    pub distributions: Map<Address, i128>,
}

// ============================================================
// Storage Keys
// ============================================================

/// Storage key for split configurations: SplitConfigs by karya_id
const SPLITS: Symbol = symbol_short!("SPLITS");

/// Storage key for tracking if a karya has a split
const HAS_SPLIT: Symbol = symbol_short!("HAS_SPLIT");

/// Storage key for distribution history
const HISTORY: Symbol = symbol_short!("HISTORY");

/// Storage key for the next history index
const NEXT_HISTORY: Symbol = symbol_short!("NEXT_HIST");

/// Storage key for the total distributed per karya
const TOTAL_DIST: Symbol = symbol_short!("TOT_DIST");

/// Storage key for admin/owner of the contract
const ADMIN: Symbol = symbol_short!("ADMIN");

// ============================================================
// Contract Implementation
// ============================================================

#[contract]
pub struct RoyaltySplit;

#[contractimpl]
impl RoyaltySplit {
    // ----------------------------------------------------------
    // Initialization
    // ----------------------------------------------------------

    /// Initialize the contract with an admin address
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&ADMIN) {
            panic!("Contract already initialized");
        }
        env.storage().instance().set(&ADMIN, &admin);
    }

    // ----------------------------------------------------------
    // Split Management
    // ----------------------------------------------------------

    /// Create a new royalty split configuration for a karya.
    ///
    /// # Arguments
    /// * `karya_id` - Unique identifier for the karya
    /// * `recipients` - List of recipients with their percentage allocations
    ///
    /// # Errors
    /// * `SplitAlreadyExists` - A split already exists for this karya_id
    /// * `TotalPercentageExceeded` - Total percentage exceeds 100% (10000 bps)
    /// * `NoRecipients` - No recipients provided
    /// * `InvalidPercentage` - A recipient has percentage = 0
    /// * `DuplicateRecipient` - Same wallet appears more than once
    pub fn create_split(
        env: Env,
        karya_id: Symbol,
        creator: Address,
        recipients: Vec<Recipient>,
    ) -> Result<SplitConfig, RoyaltyError> {
        // Authenticate the creator
        creator.require_auth();

        // Check if split already exists
        if env.storage().instance().has(&(HAS_SPLIT, &karya_id)) {
            return Err(RoyaltyError::SplitAlreadyExists);
        }

        // Validate recipients
        if recipients.is_empty() {
            return Err(RoyaltyError::NoRecipients);
        }

        // Check for duplicate addresses and validate percentages
        let mut total_bps: u32 = 0;
        let mut seen = Map::new(&env);
        for recipient in recipients.iter() {
            if recipient.percentage_bps == 0 {
                return Err(RoyaltyError::InvalidPercentage);
            }
            if seen.contains_key(recipient.wallet.clone()) {
                return Err(RoyaltyError::DuplicateRecipient);
            }
            seen.set(recipient.wallet.clone(), true);
            total_bps += recipient.percentage_bps;
        }

        if total_bps > 10000 {
            return Err(RoyaltyError::TotalPercentageExceeded);
        }

        let config = SplitConfig {
            karya_id: karya_id.clone(),
            creator: creator.clone(),
            recipients,
            total_percentage_bps: total_bps,
            active: true,
            created_at: env.ledger().timestamp(),
        };

        // Store split configuration
        env.storage().instance().set(&(SPLITS, &karya_id), &config);
        env.storage().instance().set(&(HAS_SPLIT, &karya_id), &true);

        // Initialize total distributed counter
        env.storage().instance().set(&(TOTAL_DIST, &karya_id), &0i128);

        Ok(config)
    }

    /// Get a split configuration for a karya
    pub fn get_split(env: Env, karya_id: Symbol) -> Result<SplitConfig, RoyaltyError> {
        env.storage()
            .instance()
            .get(&(SPLITS, &karya_id))
            .ok_or(RoyaltyError::SplitNotFound)
    }

    /// Update an existing split configuration (creator only)
    pub fn update_split(
        env: Env,
        karya_id: Symbol,
        new_recipients: Vec<Recipient>,
    ) -> Result<SplitConfig, RoyaltyError> {
        // Get existing config
        let mut config = env.storage()
            .instance()
            .get::<_, SplitConfig>(&(SPLITS, &karya_id))
            .ok_or(RoyaltyError::SplitNotFound)?;

        // Authenticate the creator
        config.creator.require_auth();

        // Validate new recipients
        if new_recipients.is_empty() {
            return Err(RoyaltyError::NoRecipients);
        }

        let mut total_bps: u32 = 0;
        let mut seen = Map::new(&env);
        for recipient in new_recipients.iter() {
            if recipient.percentage_bps == 0 {
                return Err(RoyaltyError::InvalidPercentage);
            }
            if seen.contains_key(recipient.wallet.clone()) {
                return Err(RoyaltyError::DuplicateRecipient);
            }
            seen.set(recipient.wallet.clone(), true);
            total_bps += recipient.percentage_bps;
        }

        if total_bps > 10000 {
            return Err(RoyaltyError::TotalPercentageExceeded);
        }

        // Update config
        config.recipients = new_recipients;
        config.total_percentage_bps = total_bps;

        env.storage().instance().set(&(SPLITS, &karya_id), &config);

        Ok(config)
    }

    /// Pause or reactivate a split (creator only)
    pub fn set_split_active(
        env: Env,
        karya_id: Symbol,
        active: bool,
    ) -> Result<SplitConfig, RoyaltyError> {
        let mut config = env.storage()
            .instance()
            .get::<_, SplitConfig>(&(SPLITS, &karya_id))
            .ok_or(RoyaltyError::SplitNotFound)?;

        config.creator.require_auth();

        config.active = active;
        env.storage().instance().set(&(SPLITS, &karya_id), &config);

        Ok(config)
    }

    // ----------------------------------------------------------
    // Distribution
    // ----------------------------------------------------------

    /// Execute a royalty split for a payment received.
    ///
    /// This function:
    /// 1. Validates that the split exists and is active
    /// 2. Calculates each recipient's share
    /// 3. Transfers XLM from the contract to each recipient
    /// 4. Records the distribution in history
    ///
    /// # Arguments
    /// * `karya_id` - The karya identifier
    /// * `total_amount` - Total amount to distribute (in stroops)
    /// * `token_address` - The address of the token contract (XLM or other)
    ///
    /// # Returns
    /// A map of recipient address -> amount received
    pub fn execute_split(
        env: Env,
        karya_id: Symbol,
        total_amount: i128,
        token_address: Address,
    ) -> Result<Map<Address, i128>, RoyaltyError> {
        if total_amount <= 0 {
            return Err(RoyaltyError::InvalidAmount);
        }

        // Get split config
        let config = env.storage()
            .instance()
            .get::<_, SplitConfig>(&(SPLITS, &karya_id))
            .ok_or(RoyaltyError::SplitNotFound)?;

        if !config.active {
            return Err(RoyaltyError::SplitPaused);
        }

        // Authenticate as the token contract (payment came through)
        // In practice, the caller (backend) must be authorized
        // For now, require the creator's auth
        config.creator.require_auth();

        // Calculate and execute distributions
        let mut distributions: Map<Address, i128> = Map::new(&env);
        let mut total_distributed: i128 = 0;

        for recipient in config.recipients.iter() {
            // Calculate share: total_amount * percentage_bps / 10000
            let share = (total_amount * (recipient.percentage_bps as i128)) / 10000;
            if share > 0 {
                // Transfer tokens to recipient
                let token_client = token::Client::new(&env, &token_address);
                token_client.transfer(
                    &env.current_contract_address(),
                    &recipient.wallet,
                    &share,
                );

                distributions.set(recipient.wallet.clone(), share);
                total_distributed += share;
            }
        }

        // Record distribution in history
        let history_index = env.storage()
            .instance()
            .get::<_, u64>(&NEXT_HISTORY)
            .unwrap_or(0);

        let record = DistributionRecord {
            timestamp: env.ledger().timestamp(),
            total_amount,
            distributions: distributions.clone(),
        };

        env.storage().instance().set(
            &(HISTORY, &karya_id, &history_index),
            &record,
        );
        env.storage().instance().set(&NEXT_HISTORY, &(history_index + 1));

        // Update total distributed
        let total_key = (TOTAL_DIST, &karya_id);
        let prev_total: i128 = env.storage()
            .instance()
            .get(&total_key)
            .unwrap_or(0);
        env.storage().instance().set(&total_key, &(prev_total + total_distributed));

        Ok(distributions)
    }

    /// Get the total amount distributed for a karya
    pub fn get_total_distributed(env: Env, karya_id: Symbol) -> i128 {
        env.storage()
            .instance()
            .get(&(TOTAL_DIST, &karya_id))
            .unwrap_or(0)
    }

    /// Get the distribution history count for a karya
    pub fn get_history_count(env: Env, karya_id: Symbol) -> u64 {
        env.storage()
            .instance()
            .get(&NEXT_HISTORY)
            .unwrap_or(0)
    }

    /// Get a specific distribution record from history
    pub fn get_distribution(
        env: Env,
        karya_id: Symbol,
        index: u64,
    ) -> Result<DistributionRecord, RoyaltyError> {
        env.storage()
            .instance()
            .get(&(HISTORY, &karya_id, &index))
            .ok_or(RoyaltyError::SplitNotFound)
    }

    /// Get all distribution records for a karya (paginated)
    pub fn get_distributions(
        env: Env,
        karya_id: Symbol,
        page: u64,
        page_size: u64,
    ) -> Vec<DistributionRecord> {
        let total = env.storage()
            .instance()
            .get::<_, u64>(&NEXT_HISTORY)
            .unwrap_or(0);

        let start = page * page_size;
        let end = (start + page_size).min(total);

        let mut records: Vec<DistributionRecord> = Vec::new(&env);
        for i in start..end {
            if let Some(record) = env.storage()
                .instance()
                .get::<_, DistributionRecord>(&(HISTORY, &karya_id, &i))
            {
                records.push_back(record);
            }
        }
        records
    }

    // ----------------------------------------------------------
    // Administration
    // ----------------------------------------------------------

    /// Calculate expected shares for a given amount without executing
    pub fn calculate_shares(
        env: Env,
        karya_id: Symbol,
        total_amount: i128,
    ) -> Result<Map<Address, i128>, RoyaltyError> {
        let config = env.storage()
            .instance()
            .get::<_, SplitConfig>(&(SPLITS, &karya_id))
            .ok_or(RoyaltyError::SplitNotFound)?;

        let mut shares: Map<Address, i128> = Map::new(&env);
        for recipient in config.recipients.iter() {
            let share = (total_amount * (recipient.percentage_bps as i128)) / 10000;
            if share > 0 {
                shares.set(recipient.wallet.clone(), share);
            }
        }

        Ok(shares)
    }
}

// ============================================================
// Tests
// ============================================================

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{vec, Env, Symbol};

    #[test]
    fn test_create_split() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RoyaltySplit);
        let client = RoyaltySplitClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        client.initialize(&admin);

        let creator = Address::generate(&env);
        let recipient1 = Address::generate(&env);
        let recipient2 = Address::generate(&env);

        let karya_id = Symbol::new(&env, "JINGGA001");

        let recipients = vec![
            &env,
            Recipient {
                wallet: creator.clone(),
                percentage_bps: 5000, // 50%
                role: Symbol::new(&env, "penulis"),
            },
            Recipient {
                wallet: recipient1,
                percentage_bps: 3000, // 30%
                role: Symbol::new(&env, "editor"),
            },
            Recipient {
                wallet: recipient2,
                percentage_bps: 2000, // 20%
                role: Symbol::new(&env, "ilustrator"),
            },
        ];

        let result = client.create_split(&karya_id, &creator, &recipients);
        assert!(result.is_ok());

        let config = client.get_split(&karya_id);
        assert_eq!(config.total_percentage_bps, 10000);
        assert!(config.active);
    }

    #[test]
    fn test_total_percentage_limit() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RoyaltySplit);
        let client = RoyaltySplitClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        client.initialize(&admin);

        let creator = Address::generate(&env);

        let recipients = vec![
            &env,
            Recipient {
                wallet: creator.clone(),
                percentage_bps: 6000, // 60%
                role: Symbol::new(&env, "penulis"),
            },
            Recipient {
                wallet: Address::generate(&env),
                percentage_bps: 5001, // 50.01% -> exceeds 100%
                role: Symbol::new(&env, "kolaborator"),
            },
        ];

        let result = client.create_split(&Symbol::new(&env, "JINGGA001"), &creator, &recipients);
        assert_eq!(result, Err(RoyaltyError::TotalPercentageExceeded));
    }

    #[test]
    fn test_calculate_shares() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RoyaltySplit);
        let client = RoyaltySplitClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        client.initialize(&admin);

        let creator = Address::generate(&env);
        let editor = Address::generate(&env);

        let recipients = vec![
            &env,
            Recipient {
                wallet: creator.clone(),
                percentage_bps: 7000, // 70%
                role: Symbol::new(&env, "penulis"),
            },
            Recipient {
                wallet: editor.clone(),
                percentage_bps: 3000, // 30%
                role: Symbol::new(&env, "editor"),
            },
        ];

        let karya_id = Symbol::new(&env, "JINGGA002");
        let _ = client.create_split(&karya_id, &creator, &recipients);

        // Calculate shares for 100 XLM = 1_000_000_000 stroops
        let shares = client.calculate_shares(&karya_id, &1_000_000_000i128);
        assert!(shares.is_ok());
        let shares_map = shares.unwrap();

        // Author should get 70% = 700_000_000
        assert_eq!(shares_map.get(creator.clone()).unwrap(), 700_000_000);
        // Editor should get 30% = 300_000_000
        assert_eq!(shares_map.get(editor.clone()).unwrap(), 300_000_000);
    }

    #[test]
    fn test_duplicate_recipient() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RoyaltySplit);
        let client = RoyaltySplitClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        client.initialize(&admin);

        let creator = Address::generate(&env);

        // Same wallet appears twice
        let recipients = vec![
            &env,
            Recipient {
                wallet: creator.clone(),
                percentage_bps: 5000,
                role: Symbol::new(&env, "penulis"),
            },
            Recipient {
                wallet: creator.clone(), // Duplicate!
                percentage_bps: 3000,
                role: Symbol::new(&env, "editor"),
            },
        ];

        let result = client.create_split(&Symbol::new(&env, "JINGGA003"), &creator, &recipients);
        assert_eq!(result, Err(RoyaltyError::DuplicateRecipient));
    }
}
