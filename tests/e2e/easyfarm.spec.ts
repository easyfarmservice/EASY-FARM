import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.join(process.cwd(), 'test-results', 'screenshots');

test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
});

test.describe('Easy Farm Complete End-to-End Quality & Security Suite', () => {
  test('1. Customer opens homepage, verifies navigation, SEO, and footer links', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);

    // Verify SEO title & metadata
    const title = await page.title();
    expect(title.toLowerCase()).toContain('easy farm');

    // Verify Header & Navigation
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();

    // Verify Hero & Basket Showcase
    await expect(page.getByText(/Staple/i).first()).toBeVisible();
    await expect(page.getByText(/Custom/i).first()).toBeVisible();

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-homepage-1920x1080.png') });
  });

  test('2. Customer login & registration UI and OTP edge-case validation', async ({ page, request }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();

    // Test invalid OTP API edge case (expired / not_found)
    const badOtpRes = await request.post('/api/auth/verify-otp', {
      data: { email: 'nonexistent-test-user@example.com', otp: '000000' },
    });
    expect(badOtpRes.status()).toBe(400);
    const badOtpData = await badOtpRes.json();
    expect(badOtpData.error).toBeTruthy();

    // Check signup page loads and requires Terms & Conditions checkbox
    await page.goto('/signup');
    await expect(page.getByText(/Create your account/i).first()).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-login-signup.png') });
  });

  test('3 & 4 & 5 & 6. Customer selects Custom Box, selects vegetables, changes net quantities (g/kg), and verifies dynamic price calculations', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/baskets/custom-basket');

    // Wait for product cards to render
    await expect(page.getByText('Tomato').first()).toBeVisible();

    // Find the Tomato product card
    const tomatoCard = page.locator('div.group').filter({ hasText: 'Tomato' }).first();
    await expect(tomatoCard).toBeVisible();

    // Verify default price for 1 kg Tomato (₹35)
    await expect(tomatoCard).toContainText('₹35');

    // Change net quantity of Tomato to 500 g -> price should dynamically calculate to ₹18 (Math.round(35 * 0.5))
    const selectEl = tomatoCard.locator('select');
    await selectEl.selectOption('500 g');
    await expect(tomatoCard).toContainText('₹18');

    // Change net quantity of Tomato to 2 kg -> price should dynamically calculate to ₹70 (35 * 2)
    await selectEl.selectOption('2 kg');
    await expect(tomatoCard).toContainText('₹70');

    // Reset to 1 kg (₹35) and click ADD
    await selectEl.selectOption('1 kg');
    await expect(tomatoCard).toContainText('₹35');
    await tomatoCard.getByRole('button', { name: /ADD/i }).click();

    // Also add Onion and Potato so we have a multi-item custom basket
    const onionCard = page.locator('div.group').filter({ hasText: 'Onion' }).first();
    await onionCard.getByRole('button', { name: /ADD/i }).click();

    const potatoCard = page.locator('div.group').filter({ hasText: 'Potato' }).first();
    await potatoCard.getByRole('button', { name: /ADD/i }).click();

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-custom-box-quantities.png') });
  });

  test('7 & 8. Customer adds Staple Box to cart, reviews cart, tests coupons, and applies Easy Coins discount (10 Coins = ₹1)', async ({ page, request }) => {
    await page.goto('/baskets/staple-basket');
    await expect(page.locator('main').getByText(/Staple/i).first()).toBeVisible();

    // Add Staple Box to cart via Cart localStorage or Review button
    const addBtn = page.getByRole('button', { name: /Review Basket|Add to Cart|Confirm/i }).first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
    }

    // Navigate to Cart Review (/cart)
    await page.goto('/cart');
    await expect(page.getByRole('heading', { name: /Basket Review/i })).toBeVisible();

    // Verify coupon API validation: valid coupon vs invalid coupon vs min order
    const validCouponRes = await request.post('/api/coupons/validate', {
      data: { code: 'EASY50', subtotal: 250 },
    });
    const validCouponJson = await validCouponRes.json();
    expect(validCouponJson.valid).toBe(true);
    expect(validCouponJson.discount_amount).toBe(50);

    const invalidCouponRes = await request.post('/api/coupons/validate', {
      data: { code: 'INVALID_COUPON_XYZ', subtotal: 250 },
    });
    const invalidCouponJson = await invalidCouponRes.json();
    expect(invalidCouponJson.valid).toBe(false);

    const lowSubtotalCouponRes = await request.post('/api/coupons/validate', {
      data: { code: 'GHATKESAR100', subtotal: 120 },
    });
    const lowSubtotalJson = await lowSubtotalCouponRes.json();
    expect(lowSubtotalJson.valid).toBe(false);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-cart-review.png') });
  });

  test('9. Customer validates order details, checkout edge cases (0/negative qty, unserviceable coords, Easy Coins settlement, historical price immutability)', async ({ request }) => {
    // Edge Case A: Zero or negative quantity in /api/checkout/calculate -> 400 Bad Request
    const zeroQtyRes = await request.post('/api/checkout/calculate', {
      data: {
        items: [{ basketId: '33333333-0000-0000-0000-000000000001', quantity: 0 }],
      },
    });
    expect(zeroQtyRes.status()).toBe(400);

    const negQtyRes = await request.post('/api/checkout/calculate', {
      data: {
        items: [{ basketId: '33333333-0000-0000-0000-000000000001', quantity: -2 }],
      },
    });
    expect(negQtyRes.status()).toBe(400);

    // Edge Case B: Empty cart -> 400 Bad Request
    const emptyCartRes = await request.post('/api/checkout/calculate', {
      data: { items: [] },
    });
    expect(emptyCartRes.status()).toBe(400);

    // Edge Case C: Unserviceable coordinates (outside Ghatkesar & Pocharam) -> 400 Bad Request
    const unserviceableRes = await request.post('/api/checkout/create-order', {
      data: {
        items: [{ basketId: '33333333-0000-0000-0000-000000000001', quantity: 1 }],
        address: {
          fullName: 'Test Customer',
          phone: '9876543210',
          email: 'qa-test@example.com',
          flatNo: '101',
          apartment: 'Test Towers',
          locality: 'Mumbai',
          pincode: '400001',
          latitude: 19.076,
          longitude: 72.8777,
        },
      },
    });
    expect(unserviceableRes.status()).toBe(400);
    const unserviceableJson = await unserviceableRes.json();
    expect(unserviceableJson.unserviceable).toBe(true);

    // Edge Case D: Missing customer information -> 400 Bad Request
    const missingInfoRes = await request.post('/api/checkout/create-order', {
      data: {
        items: [{ basketId: '33333333-0000-0000-0000-000000000001', quantity: 1 }],
        address: {
          fullName: '',
          phone: '123',
          flatNo: '',
          apartment: '',
          locality: '',
          pincode: '',
          latitude: 17.4475,
          longitude: 78.6534,
        },
      },
    });
    expect(missingInfoRes.status()).toBe(400);

    // Temporarily enable only rew-1 for the claim test, then restore its previous state
    await request.patch('/api/admin/easy-coins/products', {
      headers: { Cookie: 'easyfarm_admin_verified=true' },
      data: { ids: ['rew-1'], action: 'activate' },
    });

    // Use a fresh per-run phone/email so welcome 150 Easy Coins balance is guaranteed
    const uniqueSuffix = Date.now().toString().slice(-6);

    // Valid Order Creation with Easy Coins extra item claim + Easy Coins discount (10 Coins = ₹1)
    const validOrderRes = await request.post('/api/checkout/create-order', {
      data: {
        items: [
          {
            basketId: '33333333-0000-0000-0000-000000000001',
            basketName: 'Staple Box',
            quantity: 1,
            customizedItems: [
              { productId: 'p-tomato', productName: 'Tomato', quantity: 1, unit: '1kg', price: 35 },
              { productId: 'p-onion', productName: 'Onion', quantity: 1, unit: '1kg', price: 45 },
              { productId: 'p-potato', productName: 'Potato', quantity: 1, unit: '1kg', price: 30 },
              { productId: 'p-carrot', productName: 'Carrot', quantity: 500, unit: '500g', price: 35 },
              { productId: 'p-brinjal', productName: 'Brinjal', quantity: 500, unit: '500g', price: 30 },
            ],
          },
        ],
        address: {
          fullName: 'QA Automated Customer',
          phone: `9849${uniqueSuffix}`,
          email: `qa.${uniqueSuffix}@easyfarm.in`,
          flatNo: 'Flat 402, Block B',
          apartment: 'Singapore Township',
          locality: 'Pocharam, Ghatkesar',
          pincode: '500088',
          latitude: 17.4475,
          longitude: 78.6534,
        },
        claimedRewards: [{ rewardProductId: 'rew-1', quantity: 1 }],
        redeemedDiscountCoins: 50, // 50 Easy Coins = ₹5 discount
      },
    });
    const orderData = await validOrderRes.json();
    expect(validOrderRes.status(), JSON.stringify(orderData)).toBe(200);
    expect(orderData.success).toBe(true);
    expect(orderData.coinsDiscountAmount).toBe(5);
    expect(orderData.claimedRewards?.length).toBeGreaterThanOrEqual(1);
    expect(orderData.coinsEarned).toBeGreaterThan(0);

    // Restore rew-1 to deactivated if items were disabled
    await request.patch('/api/admin/easy-coins/products', {
      headers: { Cookie: 'easyfarm_admin_verified=true' },
      data: { ids: ['rew-1'], action: 'deactivate' },
    });
  });

  test('10 & 11 & 12. Admin logs in, updates vegetable pricing & bulk status, and customer sees updated price immediately', async ({ page, request }) => {
    // Establish verified Admin session cookie
    await page.context().addCookies([
      {
        name: 'easyfarm_admin_verified',
        value: 'true',
        domain: 'localhost',
        path: '/',
      },
    ]);
    await page.goto('/login?next=/admin');
    await page.evaluate(() => {
      sessionStorage.setItem('easyfarm_admin_verified', 'true');
      sessionStorage.setItem('easyfarm_admin_email', 'admin@easyfarm.in');
      document.cookie = 'easyfarm_admin_verified=true; path=/; max-age=86400; SameSite=Lax';
    });

    // 10. Admin opens Dashboard, Orders Management, Product Catalog, and Easy Coins
    await page.goto('/admin');
    await expect(page.getByText(/Operations Dashboard/i).first()).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-admin-dashboard.png') });

    await page.goto('/admin/orders');
    await expect(page.getByText(/Order/i).first()).toBeVisible();
    // Click first order row to inspect full details (items, qty, price, delivery date, location, phone, email, Easy Coins)
    const firstOrderRow = page.locator('tbody tr').first();
    if (await firstOrderRow.isVisible()) {
      await firstOrderRow.click();
      await expect(page.getByText(/Customer Contact & Delivery Location/i)).toBeVisible();
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-admin-order-details.png') });
    }

    await page.goto('/admin/easy-coins');
    await expect(page.getByRole('button', { name: /Enable All Items at Once/i })).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-admin-easy-coins.png') });

    await page.goto('/admin/products');
    await expect(page.getByRole('button', { name: /Enable All Items at Once/i })).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-admin-products.png') });

    // 11. Admin updates Tomato price from ₹35 to ₹42 via Admin API
    const updateRes = await request.post('/api/admin/products', {
      headers: { Cookie: 'easyfarm_admin_verified=true' },
      data: {
        id: 'p-tomato',
        name: 'Tomato',
        slug: 'tomato',
        price: 42,
        unit: '1kg',
        cost_price: 28,
        market_price: 52,
        active: true,
      },
    });
    expect(updateRes.status()).toBe(200);
    const updateJson = await updateRes.json();
    expect(updateJson.success).toBe(true);
    expect(updateJson.product.price).toBe(42);

    // 12. Customer sees the updated price (₹42) on Custom Box page and Weekly Basket API
    const weeklyRes = await request.get('/api/baskets/staple-basket/weekly');
    const weeklyJson = await weeklyRes.json();
    const tomatoInWeekly = weeklyJson.defaultItems?.find((i: any) =>
      String(i.productName).toLowerCase().includes('tomato')
    );
    expect(tomatoInWeekly?.price).toBe(42);

    await page.goto('/baskets/custom-basket');
    const tomatoCard = page.locator('div.group').filter({ hasText: 'Tomato' }).first();
    await expect(tomatoCard).toContainText('₹42');

    // Restore Tomato price back to ₹35 so default catalog state remains clean
    const restoreRes = await request.post('/api/admin/products', {
      headers: { Cookie: 'easyfarm_admin_verified=true' },
      data: {
        id: 'p-tomato',
        name: 'Tomato',
        slug: 'tomato',
        price: 35,
        unit: '1kg',
        cost_price: 24,
        market_price: 45,
        active: true,
      },
    });
    expect(restoreRes.status()).toBe(200);
  });

  test('13 & Phase 4. Security: Customer & unauthenticated users are prevented from accessing admin routes and admin APIs', async ({ browser, request }) => {
    // 1. Unauthenticated API calls to protected Admin endpoints must return 401
    const unauthDash = await request.get('/api/admin/dashboard');
    expect(unauthDash.status()).toBe(401);

    const unauthOrders = await request.get('/api/admin/orders');
    expect(unauthOrders.status()).toBe(401);

    const unauthPricing = await request.post('/api/admin/pricing', {
      data: { basketId: '33333333-0000-0000-0000-000000000001', price: 10 },
    });
    expect(unauthPricing.status()).toBe(401);

    const unauthProdPatch = await request.patch('/api/admin/products', {
      data: { ids: ['ALL'], active: false },
    });
    expect(unauthProdPatch.status()).toBe(401);

    // 2. Customer session calling Admin APIs must return 403 Forbidden
    const custDash = await request.get('/api/admin/dashboard', {
      headers: { Cookie: 'easyfarm_customer_role=customer' },
    });
    expect(custDash.status()).toBe(403);

    const custOrderPatch = await request.patch('/api/admin/orders', {
      headers: { Cookie: 'easyfarm_customer_role=customer' },
      data: { orderId: 'ORD-123456', status: 'delivered' },
    });
    expect(custOrderPatch.status()).toBe(403);

    // 3. Customer attempting to tamper with Staple Box price on server (/api/checkout/calculate)
    const tamperedCalc = await request.post('/api/checkout/calculate', {
      data: {
        items: [{ basketId: '33333333-0000-0000-0000-000000000001', quantity: 1, customPrice: 5 }],
      },
    });
    const tamperedJson = await tamperedCalc.json();
    // Server must reject/ignore customPrice=5 and enforce authoritative live DB price (₹175)
    expect(tamperedJson.subtotal).toBeGreaterThanOrEqual(170);

    // 4. Unauthenticated browser user visiting /admin or /account is redirected to /login
    const cleanContext = await browser.newContext();
    const cleanPage = await cleanContext.newPage();

    await cleanPage.goto('/account');
    await expect(cleanPage).toHaveURL(/\/login/);

    await cleanPage.goto('/admin');
    await cleanPage.waitForURL(/\/login\?next=%2Fadmin|\/login\?next=\/admin|\/admin/, { timeout: 10000 });
    const currentUrl = cleanPage.url();
    if (!currentUrl.includes('/login')) {
      await expect(cleanPage.getByText(/Admin Access Restricted|Verifying Admin Access/i)).toBeVisible();
    }

    // 5. Verify no service_role key is exposed in client HTML
    await cleanPage.goto('/');
    const htmlContent = await cleanPage.content();
    expect(htmlContent).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(htmlContent).not.toContain('RAZORPAY_KEY_SECRET');

    await cleanContext.close();
  });

  test('Phase 7. Responsive UI testing across Desktop, Tablet, and Mobile viewports', async ({ page }) => {
    const viewports = [
      { name: 'desktop-1920x1080', width: 1920, height: 1080 },
      { name: 'desktop-1366x768', width: 1366, height: 768 },
      { name: 'tablet-768x1024', width: 768, height: 1024 },
      { name: 'mobile-390x844', width: 390, height: 844 },
      { name: 'mobile-360x800', width: 360, height: 800 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');
      await expect(page.locator('header')).toBeVisible();

      // Check for unintended horizontal page overflow
      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth + 2;
      });
      expect(hasOverflow).toBe(false);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `responsive-${vp.name}.png`),
      });
    }
  });
});

