# Inlayora theme

Shopify Online Store 2.0 theme for Inlayora (handcrafted mango wood trays and side tables). Built on Shopify's [Skeleton theme](https://github.com/Shopify/skeleton-theme).

## Work on it

```bash
cd inlayora
shopify theme dev --store <store>.myshopify.com
```

Pull editor changes before pushing, so settings saved in the theme editor are not overwritten:

```bash
shopify theme pull --store <store>.myshopify.com --theme <theme-id> --only "templates/*.json" --only "sections/*.json" --only "config/settings_data.json"
shopify theme push --store <store>.myshopify.com --theme <theme-id>
```

Check before pushing:

```bash
shopify theme check
```

## Product data the theme reads

- Variant option named **Size** with inches in the value, e.g. `Small (12")`, powers the size check.
- Metafields `custom.dimensions`, `custom.material`, `custom.finish`, `custom.care`, `custom.short_fact`.
- Reviews app ratings in `reviews.rating` and `reviews.rating_count` show the review link near the title.
