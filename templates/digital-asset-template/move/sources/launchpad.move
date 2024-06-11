module launchpad_addr::launchpad {
    use std::option::{Self, Option};
    use std::signer;
    use std::string::{Self, String};
    use std::vector;

    use aptos_std::simple_map::{Self, SimpleMap};
    use aptos_std::string_utils;

    use aptos_framework::aptos_account;
    use aptos_framework::event;
    use aptos_framework::object::{Self, Object};

    use aptos_token_objects::collection::{Self, Collection};
    use aptos_token_objects::royalty::{Self, Royalty};
    use aptos_token_objects::token::{Self, Token};

    use minter::token_components;
    use minter::mint_stage;
    use minter::collection_components;

    /// Sender is not admin
    const ENOT_ADMIN: u64 = 1;
    /// Sender is not pending admin
    const ENOT_PENDING_ADMIN: u64 = 2;
    /// Only admin can update mint fee collector
    const EONLY_ADMIN_CAN_UPDATE_MINT_FEE_COLLECTOR: u64 = 3;
    /// Only admin can create collection
    const EONLY_ADMIN_CAN_CREATE_COLLECTION: u64 = 4;
    /// No active mint stages
    const E_NO_ACTIVE_STAGES: u64 = 5;

    const ALLOWLIST_MINT_STAGE_CATEGORY: vector<u8> = b"Allowlist mint stage";
    const PUBLIC_MINT_MINT_STAGE_CATEGORY: vector<u8> = b"Public mint mint stage";

    #[event]
    struct CreateCollectionEvent has store, drop {
        creator_addr: address,
        collection_owner_obj: Object<CollectionOwnerObjConfig>,
        collection_obj: Object<Collection>,
        max_supply: Option<u64>,
        name: String,
        description: String,
        uri: String,
        pre_mint_amount: u64,
        allowlist: Option<vector<address>>,
        allowlist_start_time: Option<u64>,
        allowlist_end_time: Option<u64>,
        allowlist_mint_limit_per_addr: Option<u64>,
        allowlist_mint_fee_per_nft: Option<u64>,
        public_mint_start_time: Option<u64>,
        public_mint_end_time: Option<u64>,
        public_mint_limit_per_addr: Option<u64>,
        public_mint_fee_per_nft: Option<u64>,
    }

    #[event]
    struct MintNftEvent has store, drop {
        collection_obj: Object<Collection>,
        nft_obj: Object<Token>,
        recipient_addr: address,
        mint_fee: u64,
    }

    #[event]
    struct BatchMintNftsEvent has store, drop {
        collection_obj: Object<Collection>,
        nft_objs: vector<Object<Token>>,
        recipient_addr: address,
        total_mint_fee: u64,
    }

    #[event]
    struct BatchPreMintNftsEvent has store, drop {
        collection_obj: Object<Collection>,
        nft_objs: vector<Object<Token>>,
        recipient_addr: address,
    }

    /// Unique per collection
    /// We need this object to own the collection object instead of contract directly owns the collection object
    /// This helps us avoid address collision when we create multiple collections with same name
    struct CollectionOwnerObjConfig has key {
        /// Only thing it stores is the link to collection object
        collection_obj: Object<Collection>,
        extend_ref: object::ExtendRef,
    }

    /// Unique per collection
    struct CollectionConfig has key {
        /// Key is stage, value is mint fee denomination
        mint_fee_per_nft_by_stages: SimpleMap<String, u64>,
        collection_owner_obj: Object<CollectionOwnerObjConfig>,
    }

    /// Global per contract
    struct Registry has key {
        collection_objects: vector<Object<Collection>>
    }

    /// Global per contract
    struct Config has key {
        admin_addr: address,
        pending_admin_addr: Option<address>,
        mint_fee_collector_addr: address,
    }

    // If you deploy the module under an object, sender is the object's signer
    // If you deploy the module under your own account, sender is your account's signer
    fun init_module(sender: &signer) {
        move_to(sender, Registry {
            collection_objects: vector::empty()
        });
        move_to(sender, Config {
            admin_addr: signer::address_of(sender),
            pending_admin_addr: option::none(),
            mint_fee_collector_addr: signer::address_of(sender),
        });
    }

    // ================================= Entry Functions ================================= //

    public entry fun set_pending_admin(sender: &signer, new_admin: address) acquires Config {
        let sender_addr = signer::address_of(sender);
        let config = borrow_global_mut<Config>(@launchpad_addr);
        assert!(is_admin(config, sender_addr), ENOT_ADMIN);
        config.pending_admin_addr = option::some(new_admin);
    }

    public entry fun accept_admin(sender: &signer) acquires Config {
        let sender_addr = signer::address_of(sender);
        let config = borrow_global_mut<Config>(@launchpad_addr);
        assert!(is_pending_admin(config, sender_addr), ENOT_PENDING_ADMIN);
        config.admin_addr = sender_addr;
        config.pending_admin_addr = option::none();
    }

    public entry fun update_mint_fee_collector(sender: &signer, new_mint_fee_collector: address) acquires Config {
        let sender_addr = signer::address_of(sender);
        let config = borrow_global_mut<Config>(@launchpad_addr);
        assert!(is_admin(config, sender_addr), EONLY_ADMIN_CAN_UPDATE_MINT_FEE_COLLECTOR);
        config.mint_fee_collector_addr = new_mint_fee_collector;
    }

    public entry fun create_collection(
        sender: &signer,
        description: String,
        name: String,
        uri: String,
        max_supply: Option<u64>,
        royalty_percentage: Option<u64>,
        pre_mint_amount: u64,
        allowlist: Option<vector<address>>,
        allowlist_start_time: Option<u64>,
        allowlist_end_time: Option<u64>,
        allowlist_mint_limit_per_addr: Option<u64>,
        allowlist_mint_fee_per_nft: Option<u64>,
        public_mint_start_time: Option<u64>,
        public_mint_end_time: Option<u64>,
        public_mint_limit_per_addr: Option<u64>,
        public_mint_fee_per_nft: Option<u64>,
    ) acquires Registry, Config, CollectionConfig, CollectionOwnerObjConfig {
        let sender_addr = signer::address_of(sender);
        let config = borrow_global<Config>(@launchpad_addr);
        assert!(is_admin(config, sender_addr), EONLY_ADMIN_CAN_CREATE_COLLECTION);

        let royalty = royalty(&mut royalty_percentage, sender_addr);

        let collection_owner_obj_constructor_ref = &object::create_object(@launchpad_addr);
        let collection_owner_obj_signer = &object::generate_signer(collection_owner_obj_constructor_ref);

        let collection_obj_constructor_ref = if (option::is_some(&max_supply)) {
            &collection::create_fixed_collection(
                collection_owner_obj_signer,
                description,
                option::extract(&mut max_supply),
                name,
                royalty,
                uri,
            )
        } else {
            &collection::create_unlimited_collection(
                collection_owner_obj_signer,
                description,
                name,
                royalty,
                uri,
            )
        };
        let collection_obj_signer = &object::generate_signer(collection_obj_constructor_ref);
        let collection_obj_addr = signer::address_of(collection_obj_signer);
        let collection_obj = object::object_from_constructor_ref(collection_obj_constructor_ref);

        collection_components::create_refs_and_properties(collection_obj_constructor_ref);

        move_to(collection_owner_obj_signer, CollectionOwnerObjConfig {
            extend_ref: object::generate_extend_ref(collection_owner_obj_constructor_ref),
            collection_obj,
        });
        let collection_owner_obj = object::object_from_constructor_ref(collection_owner_obj_constructor_ref);
        move_to(collection_obj_signer, CollectionConfig {
            mint_fee_per_nft_by_stages: simple_map::new(),
            collection_owner_obj,
        });

        if (option::is_some(&allowlist)) {
            let allowlist = *option::borrow(&allowlist);
            let stage = string::utf8(ALLOWLIST_MINT_STAGE_CATEGORY);
            mint_stage::create(
                collection_obj_signer,
                stage,
                *option::borrow(&allowlist_start_time),
                *option::borrow(&allowlist_end_time),
            );

            for (i in 0..vector::length(&allowlist)) {
                mint_stage::upsert_allowlist(
                    collection_owner_obj_signer,
                    collection_obj,
                    mint_stage::find_mint_stage_index_by_name(collection_obj, stage),
                    *vector::borrow(&allowlist, i),
                    *option::borrow(&allowlist_mint_limit_per_addr)
                );
            };

            let collection_config = borrow_global_mut<CollectionConfig>(collection_obj_addr);
            simple_map::upsert(
                &mut collection_config.mint_fee_per_nft_by_stages,
                stage,
                *option::borrow(&allowlist_mint_fee_per_nft)
            );
        };

        if (option::is_some(&public_mint_end_time)) {
            let stage = string::utf8(PUBLIC_MINT_MINT_STAGE_CATEGORY);
            mint_stage::create(
                collection_obj_signer,
                stage,
                *option::borrow(&public_mint_start_time),
                *option::borrow(&public_mint_end_time),
            );

            let stage_idx = mint_stage::find_mint_stage_index_by_name(collection_obj, stage);

            if (option::is_some(&public_mint_limit_per_addr)) {
                mint_stage::upsert_public_stage_max_per_user(
                    collection_owner_obj_signer,
                    collection_obj,
                    stage_idx,
                    *option::borrow(&public_mint_limit_per_addr)
                );
            };

            let collection_config = borrow_global_mut<CollectionConfig>(collection_obj_addr);
            simple_map::upsert(
                &mut collection_config.mint_fee_per_nft_by_stages,
                stage,
                *option::borrow(&public_mint_fee_per_nft)
            );
        };

        let registry = borrow_global_mut<Registry>(@launchpad_addr);
        vector::push_back(&mut registry.collection_objects, collection_obj);

        event::emit(CreateCollectionEvent {
            creator_addr: sender_addr,
            collection_owner_obj,
            collection_obj,
            max_supply,
            name,
            description,
            uri,
            pre_mint_amount,
            allowlist,
            allowlist_start_time,
            allowlist_end_time,
            allowlist_mint_limit_per_addr,
            allowlist_mint_fee_per_nft,
            public_mint_start_time,
            public_mint_end_time,
            public_mint_limit_per_addr,
            public_mint_fee_per_nft,
        });

        let nft_objs = vector[];
        for (i in 0..pre_mint_amount) {
            let nft_obj = mint_nft_internal(sender_addr, collection_obj);
            vector::push_back(&mut nft_objs, nft_obj);
        };

        event::emit(BatchPreMintNftsEvent {
            recipient_addr: sender_addr,
            collection_obj,
            nft_objs,
        });
    }

    public entry fun mint_nft(
        sender: &signer,
        collection_obj: Object<Collection>
    ) acquires CollectionConfig, CollectionOwnerObjConfig, Config {
        let sender_addr = signer::address_of(sender);

        let stage_idx = &mint_stage::execute_earliest_stage(sender, collection_obj, 1);
        assert!(option::is_some(stage_idx), E_NO_ACTIVE_STAGES);

        let mint_fee = get_mint_fee_per_nft(collection_obj, *option::borrow(stage_idx));
        pay_for_mint(sender, mint_fee);

        let nft_obj = mint_nft_internal(sender_addr, collection_obj);

        event::emit(MintNftEvent {
            recipient_addr: sender_addr,
            mint_fee,
            collection_obj,
            nft_obj,
        });
    }

    public entry fun batch_mint_nft(
        sender: &signer,
        collection_obj: Object<Collection>,
        amount: u64,
    ) acquires CollectionConfig, CollectionOwnerObjConfig, Config {
        let sender_addr = signer::address_of(sender);

        let stage_idx = &mint_stage::execute_earliest_stage(sender, collection_obj, amount);
        assert!(option::is_some(stage_idx), E_NO_ACTIVE_STAGES);

        let total_mint_fee = amount * get_mint_fee_per_nft(collection_obj, *option::borrow(stage_idx));
        pay_for_mint(sender, total_mint_fee);

        let nft_objs = vector[];
        for (i in 0..amount) {
            let nft_obj = mint_nft_internal(sender_addr, collection_obj);
            vector::push_back(&mut nft_objs, nft_obj);
        };

        event::emit(BatchMintNftsEvent {
            recipient_addr: sender_addr,
            total_mint_fee,
            collection_obj,
            nft_objs,
        });
    }

    // ================================= View  ================================= //

    #[view]
    public fun get_admin(): address acquires Config {
        let config = borrow_global<Config>(@launchpad_addr);
        config.admin_addr
    }

    #[view]
    public fun get_mint_fee_collector(): address acquires Config {
        let config = borrow_global<Config>(@launchpad_addr);
        config.mint_fee_collector_addr
    }

    #[view]
    public fun get_registry(): vector<Object<Collection>> acquires Registry {
        let registry = borrow_global<Registry>(@launchpad_addr);
        registry.collection_objects
    }

    #[view]
    public fun get_mint_fee_per_nft(
        collection_obj: Object<Collection>,
        stage_idx: u64,
    ): u64 acquires CollectionConfig {
        let stage_obj = mint_stage::find_mint_stage_by_index(collection_obj, stage_idx);
        let stage_name = mint_stage::mint_stage_name(stage_obj);
        let collection_config = borrow_global<CollectionConfig>(object::object_address(&collection_obj));
        let fee = *simple_map::borrow(&collection_config.mint_fee_per_nft_by_stages, &stage_name);
        fee
    }

    // ================================= Helpers ================================= //

    fun is_admin(config: &Config, sender: address): bool {
        if (sender == config.admin_addr) {
            true
        } else {
            if (object::is_object(@launchpad_addr)) {
                let obj = object::address_to_object<object::ObjectCore>(@launchpad_addr);
                object::is_owner(obj, sender)
            } else {
                false
            }
        }
    }

    fun is_pending_admin(config: &Config, sender: address): bool {
        config.pending_admin_addr == option::some(sender)
    }

    fun pay_for_mint(sender: &signer, mint_fee: u64) acquires Config {
        if (mint_fee > 0) {
            aptos_account::transfer(sender, get_mint_fee_collector(), mint_fee);
        }
    }

    fun royalty(
        royalty_numerator: &mut Option<u64>,
        admin_addr: address,
    ): Option<Royalty> {
        if (option::is_some(royalty_numerator)) {
            let num = option::extract(royalty_numerator);
            option::some(royalty::create(num, 100, admin_addr))
        } else {
            option::none()
        }
    }

    fun mint_nft_internal(
        sender_addr: address,
        collection_obj: Object<Collection>,
    ): Object<Token> acquires CollectionConfig, CollectionOwnerObjConfig {
        let collection_config = borrow_global<CollectionConfig>(object::object_address(&collection_obj));

        let collection_owner_obj = collection_config.collection_owner_obj;
        let collection_owner_config = borrow_global<CollectionOwnerObjConfig>(
            object::object_address(&collection_owner_obj)
        );
        let collection_owner_obj_signer = &object::generate_signer_for_extending(&collection_owner_config.extend_ref);

        let next_nft_id = *option::borrow(&collection::count(collection_obj)) + 1;

        let collection_uri = collection::uri(collection_obj);
        let nft_metadata_uri = construct_nft_metadata_uri(&collection_uri, next_nft_id);

        let nft_obj_constructor_ref = &token::create(
            collection_owner_obj_signer,
            collection::name(collection_obj),
            // placeholder value, please read description from json metadata in offchain storage
            string_utils::to_string(&next_nft_id),
            // placeholder value, please read name from json metadata in offchain storage
            string_utils::to_string(&next_nft_id),
            royalty::get(collection_obj),
            nft_metadata_uri,
        );
        token_components::create_refs(nft_obj_constructor_ref);
        let nft_obj = object::object_from_constructor_ref(nft_obj_constructor_ref);
        object::transfer(collection_owner_obj_signer, nft_obj, sender_addr);

        nft_obj
    }

    fun construct_nft_metadata_uri(
        collection_uri: &String,
        next_nft_id: u64,
    ): String {
        let nft_metadata_uri = &mut string::sub_string(
            collection_uri,
            0,
            string::length(collection_uri) - string::length(&string::utf8(b"collection.json"))
        );
        let nft_metadata_filename = string_utils::format1(&b"{}.json", next_nft_id);
        string::append(nft_metadata_uri, nft_metadata_filename);
        *nft_metadata_uri
    }

    #[test_only]
    use aptos_framework::aptos_coin::{Self, AptosCoin};
    #[test_only]
    use aptos_framework::coin;
    #[test_only]
    use aptos_framework::timestamp;
    #[test_only]
    use aptos_framework::account;

    #[test(aptos_framework = @0x1, sender = @launchpad_addr, user1 = @0x200, user2 = @0x201)]
    fun test_happy_path(
        aptos_framework: &signer,
        sender: &signer,
        user1: &signer,
        user2: &signer,
    ) acquires Registry, Config, CollectionConfig, CollectionOwnerObjConfig {
        let (burn_cap, mint_cap) = aptos_coin::initialize_for_test(aptos_framework);

        let user1_addr = signer::address_of(user1);
        let user2_addr = signer::address_of(user2);

        timestamp::set_time_has_started_for_testing(aptos_framework);
        account::create_account_for_test(user1_addr);
        account::create_account_for_test(user2_addr);
        coin::register<AptosCoin>(user1);

        init_module(sender);

        // create first collection

        create_collection(
            sender,
            string::utf8(b"description"),
            string::utf8(b"name"),
            string::utf8(b"https://gateway.irys.xyz/manifest_id/collection.json"),
            option::some(10),
            option::some(10),
            3,
            option::some(vector[user1_addr]),
            option::some(timestamp::now_seconds()),
            option::some(timestamp::now_seconds() + 100),
            option::some(3),
            option::some(5),
            option::some(timestamp::now_seconds() + 200),
            option::some(timestamp::now_seconds() + 300),
            option::some(2),
            option::some(10),
        );
        let registry = get_registry();
        let collection_1 = *vector::borrow(&registry, vector::length(&registry) - 1);
        assert!(collection::count(collection_1) == option::some(3), 1);

        let mint_fee = get_mint_fee_per_nft(collection_1, 0);
        aptos_coin::mint(aptos_framework, user1_addr, mint_fee);

        mint_nft(user1, collection_1);

        let nft = mint_nft_internal(user1_addr, collection_1);
        assert!(token::uri(nft) == string::utf8(b"https://gateway.irys.xyz/manifest_id/5.json"), 2);

        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }
}
