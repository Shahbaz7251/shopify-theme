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

## Theme settings worth knowing

- **Contact:** WhatsApp number, title and up to 3 topics for the floating WhatsApp button (on product pages it also offers "ask about this product"), plus the contact email.
- **Delivery:** free-delivery threshold (0 = free on every order), dispatch and delivery days, return days and cash on delivery, used in the product page delivery estimate and trust lines.
- **Collection highlight:** the collection template can show a chosen collection (e.g. a festive edit) at the top of other collections; the main grid skips those products.

## Apps

- Reviews: any OS2 reviews app with app blocks. The product template has a slot for the review widget in the "Reviews & questions" section (tested with Judge.me).

## CSS

There are no theme stylesheet files. Global styles live in `snippets/base-styles.liquid` and are inlined in `<head>`; each section keeps its own CSS in a `<style>` tag at the top of the file. This keeps render-blocking requests off the critical path on mobile.
