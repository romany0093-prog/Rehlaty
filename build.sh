#!/bin/sh
# Rebuild index.html from src/
cd "$(dirname "$0")"
{ cat src/1-head.html; cat src/2-base.js src/3-seed.js src/4-store.js src/4b-cloud.js src/5-ui.js src/5b-mobile.js src/6-public.js src/6b-offers-compare.js src/6c-install.js src/6d-reset.js src/6e-requests.js src/7-customer.js src/8-company.js src/9-admin.js src/10-router.js; printf '\n</script>\n</body>\n</html>\n'; } > index.html
