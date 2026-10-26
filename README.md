# ستاره طلایی | Setare Talaei

Prototype storefront for the Setare Talaei rug brand (فرش، کناره، پادری، روفرشی، گلیم), built from the executive proposal deck.

- **Hero:** a raymarched WebGL night desert; stars gather into a rug constellation that waves when you hover it.
- **Shop:** popups, banner slider, timed deals, category and bestseller sliders, rug-specific filters, search, compare, wishlist.
- **Product:** zoom lens, colour and size variants, installment price, real-scale 3D model with AR (model-viewer).
- **See it at home:** sample room, your own room photo, and a size finder.
- **AI advisor** (rule-based demo), mobile + OTP login, checkout with gateway / wallet / split / اسنپ‌پی / دی‌جی‌پی.
- **Account:** wallet, gift cards, returns to wallet, loyalty club. **Admin panel demo:** `admin.html`.

All rug images are generated procedurally in `js/rugs.js`. Prices, reviews and payments are demo data.

## Run locally

Any static server works, for example:

```bash
ruby -run -e httpd . -p 8780
```

Then open http://localhost:8780.
