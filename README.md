## trainyard ai

the people whose data trained the models powering today's ai got paid nothing.

the new york times is suing openai. getty is suing stability ai. artists are suing midjourney. the era of scraping data without permission is ending, and the market for licensed ai training data is being created right now, in real time, through litigation. trainyard is the infrastructure for what comes next.

it is a marketplace where anyone who has data gets paid directly for it. a medical research lab with 80,000 annotated scans. a photographer collective with years of labeled images. a university nlp group that spent three years building a multilingual corpus. they upload once. every time someone buys, they earn. no middlemen, no contracts, no waiting 90 days for a wire transfer.


## how it works

contributors connect a sui wallet, upload their dataset, and set a price. the file encrypts in the browser before it leaves their machine — trainyard never sees the raw data. the encrypted blob goes to walrus mainnet where it lives permanently, content-addressed, owned by no one. the listing goes live with an ai-generated description and a low-resolution preview so buyers can evaluate the data without getting it for free.

buyers browse the marketplace, see the preview, and pay in usdc. no gas fees. no sui required. no wallet complexity. the payment clears, the decryption key releases, the file downloads and decrypts locally. start to finish it feels like buying something on gumroad, except the dataset lives on decentralized storage forever and the seller gets paid immediately with no platform able to reverse or withhold the transaction.

the platform takes 5% per sale and uses that to cover walrus storage costs, which run $0.023 per gb per month. the economics work from the first transaction. every subsequent sale of the same dataset is nearly pure margin since the blob is already stored.


## why walrus

the immutability is not a feature, it is the product.

a dataset listed on trainyard cannot be taken down. it cannot be modified after the fact. its blob id is a permanent, content-addressed reference that anyone can verify. when a buyer purchases access, they are not trusting trainyard to keep the file around. they are trusting cryptographic guarantees that the file exists and has not changed since it was listed. a subpoena to our servers cannot remove a walrus blob. an acquisition cannot change what the data contains. this is the property that makes trainyard viable as infrastructure for the ai industry, where provenance and permanence are legal requirements, not nice-to-haves.

walrus also costs $0.023 per gb per month. for context, storing a 10 gb dataset for a year costs about $2.76. the decentralized storage argument no longer requires a cost premium.


## built with

react and vite on the frontend. fastapi and supabase on the backend. walrus mainnet for encrypted blob storage at $0.023 per gb per month. sui mainnet for identity and settlement. tatum rpc nodes for sui connectivity via their free api key. groq for ai-generated dataset descriptions. aes-256-gcm encryption running entirely in the browser via the web crypto api — the backend never receives unencrypted data.


## economics

storage costs $0.023 per gb per month on walrus mainnet. the platform earns 5% commission on every sale. a 1 gb dataset priced at 1 sui generates $0.05 in commission against $0.023 in storage costs on the first sale. every sale after that costs nothing to serve — the blob is already on walrus. the model is profitable from transaction one.


## hackathon

built for the tatum x walrus hackathon, may–june 2026. sui mainnet. walrus mainnet. tatum rpc (free tier). real transactions, real storage, real data.