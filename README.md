
# Bot Apartment CROUS

> Check if there is an apartment available for you in France

- [x] Configurable as needed
- [x] Supports multiple languages
- [x] Easy to edit as desired
- [x] Lightweight for a Bun app

## Requirements

You need [bun.sh](https://bun.sh) to use this app.

## How to Run

Copy `.env.example` and rename it to `.env`, then update the values as needed.

After that, run the app with the following command:
```bash
bun run src/index.ts
```

## BLC Commands

- `check`: Fetches data from the `BLC_URL` and returns a response.
- `history`: Prints your search history in the console.
