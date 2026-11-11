import { LegalDocumentKey } from '@/types/legal';

export interface LegalSection {
  id: string;
  number: number;
  title: string;
}

export const TERMS_SECTIONS: LegalSection[] = [
  { id: 'section-1', number: 1, title: 'Introduction & Platform Scope' },
  { id: 'section-2', number: 2, title: 'Customer Registration & Account Security' },
  { id: 'section-3', number: 3, title: 'Products, Quality & Freshness Guarantee' },
  { id: 'section-4', number: 4, title: 'Pricing, Taxes & Payment Processing' },
  { id: 'section-5', number: 5, title: 'Weekly Ordering Cycle & Order Acceptance' },
  { id: 'section-6', number: 6, title: 'Delivery Arrangements & Serviceable Corridor' },
  { id: 'section-7', number: 7, title: 'Order Cancellation Policy' },
  { id: 'section-8', number: 8, title: 'Refunds & Product Quality Complaints' },
  { id: 'section-9', number: 9, title: 'Easy Coins Loyalty Program' },
  { id: 'section-10', number: 10, title: 'Weekly Streak & Milestone Rewards' },
  { id: 'section-11', number: 11, title: 'Coupons & Promotional Offers' },
  { id: 'section-12', number: 12, title: 'Customer Responsibilities & Acceptable Use' },
  { id: 'section-13', number: 13, title: 'Complaints, Customer Support & Grievance Redressal' },
  { id: 'section-14', number: 14, title: 'Platform Availability, Maintenance & Modifications' },
  { id: 'section-15', number: 15, title: 'Limitation of Liability & Governing Law' },
  { id: 'section-16', number: 16, title: 'Policy Updates & Renewed Acceptance' },
];

export const PRIVACY_SECTIONS: LegalSection[] = [
  { id: 'section-1', number: 1, title: 'Introduction & Privacy Commitment' },
  { id: 'section-2', number: 2, title: 'Information We Collect' },
  { id: 'section-3', number: 3, title: 'How Information is Collected' },
  { id: 'section-4', number: 4, title: 'How We Use Your Information' },
  { id: 'section-5', number: 5, title: 'Payment Information & Financial Security' },
  { id: 'section-6', number: 6, title: 'Easy Coins & Weekly Streak Loyalty Information' },
  { id: 'section-7', number: 7, title: 'Cookies & Local Device Storage' },
  { id: 'section-8', number: 8, title: 'Third-Party Technical Service Providers' },
  { id: 'section-9', number: 9, title: 'Information Sharing & Disclosure' },
  { id: 'section-10', number: 10, title: 'Data Security & Protection Safeguards' },
  { id: 'section-11', number: 11, title: 'Data Retention & Archival Policies' },
  { id: 'section-12', number: 12, title: 'Your Privacy Rights & Choices' },
  { id: 'section-13', number: 13, title: 'Children’s Privacy Safeguards' },
  { id: 'section-14', number: 14, title: 'Modifications to this Privacy Policy' },
  { id: 'section-15', number: 15, title: 'Privacy Grievance Officer & Contact Information' },
];

export const DEFAULT_TERMS_AND_CONDITIONS = `
# Terms & Conditions

**Effective Date:** November 11, 2026  
**Document Version:** 1.0  
**Platform:** Easy Farm (easyfarm.co.in)  
**Applicability:** Website & Mobile Application  

---

### Section 1: Introduction & Platform Scope
1.1. Welcome to Easy Farm ("Easy Farm", "we", "us", or "our"), an online farm-to-table vegetable delivery platform operating through our official website (**easyfarm.co.in**) and mobile client interfaces.  
1.2. Easy Farm is committed to building a transparent, direct food supply chain that connects regional Telangana smallholder farmers with urban households, delivering freshly harvested vegetables with zero cold storage and guaranteed Sunday doorstep drops.  
1.3. These Terms & Conditions ("Terms") constitute a legally binding agreement between you ("Customer", "you", or "your") and Easy Farm. By accessing our platform, registering an account, or placing an order for vegetable boxes, you acknowledge that you have read, understood, and agreed to be bound by these Terms and our Privacy Policy.  
1.4. **Eligibility:** To register and use Easy Farm services, you must be at least 18 years of age and competent to enter into a legally binding contract under the Indian Contract Act, 1872. If you are under 18, you may use our platform only under the direct supervision of a parent or legal guardian.

---

### Section 2: Customer Registration & Account Security
2.1. **Account Creation:** To place an order, customers must complete registration by providing accurate, current, and complete personal details, including your full name, mobile phone number, email address, and apartment/delivery address.  
2.2. **OTP Authentication:** Easy Farm utilizes secure One-Time Password (OTP) verification sent to your registered email address or mobile number. You are responsible for maintaining the confidentiality of your verification codes and device sessions.  
2.3. **Account Responsibility:** Any activity occurring under your account is your sole responsibility. You agree to notify Easy Farm customer support immediately at **easyfarmsupport@gmail.com** upon suspecting any unauthorized access.  
2.4. **Suspension & Termination:** Easy Farm reserves the right to suspend, restrict, or terminate customer accounts that provide fraudulent information, engage in abusive conduct toward our team or delivery partners, repeatedly place unverified or bogus orders, or violate applicable Indian laws.

---

### Section 3: Products, Quality & Freshness Guarantee
3.1. **Product Offerings:** Easy Farm offers two core weekly harvest offerings:  
- **Staple Box:** A curated selection of weekly essential kitchen vegetables, allowing up to 3 flexible item swaps from eligible weekly harvest crops.  
- **Custom Box:** A fully personalized vegetable box allowing you to choose individual crops and custom quantities from our full catalogue.  
3.2. **Freshness & Harvesting:** Our produce is harvested fresh from partner farms in Telangana (including Chevella, Shankarpally, and Medak) on Saturday, packed into eco-friendly, zero-plastic ventilated boxes, and delivered straight to your doorstep on Sunday before 6:00 PM. We do not use cold storage preservation, artificial waxes, or chemical ripening agents.  
3.3. **Natural Produce Variations:** Vegetables are agricultural products. Natural variations in size, shape, color, and texture are inherent to farm-fresh produce. Stated weights in product listings are target averages subject to reasonable agricultural variations of +/- 5% to 10% per crate.  
3.4. **Seasonal Availability & Substitutions:** Vegetable availability depends strictly on local seasonal weather, rainfall, and harvest conditions. If a specific crop experiences sudden unavailability due to adverse farm conditions, Easy Farm will notify you and provide an equivalent farm-fresh substitute of equal or higher value.

---

### Section 4: Pricing, Taxes & Payment Processing
4.1. **Transparent Pricing:** All vegetable box prices, item rates, and applicable delivery fees are clearly displayed in Indian Rupees (₹ INR) inclusive of all applicable taxes. We uphold farmer-first pricing and do not apply surge pricing during peak hours.  
4.2. **Payment Methods:** Easy Farm supports digital payments powered by our authorized payment gateway partner, **Razorpay Software Private Limited** ("Razorpay"). Supported payment methods include UPI (Google Pay, PhonePe, Paytm, BHIM), debit cards, credit cards, and net banking.  
4.3. **Payment Security:** Easy Farm does not collect, process, or store full credit/debit card numbers, CVVs, or UPI PINs. All financial transactions are processed securely through Razorpay's PCI-DSS Level 1 compliant infrastructure with end-to-end encryption.  
4.4. **Failed or Pending Transactions:** In the event of an interrupted network or debited amount without on-screen order confirmation, Razorpay's automated reconciliation system resolves the transaction. Debited funds for unconfirmed orders are automatically refunded to your original source account within 5 to 7 banking business days, as governed by Reserve Bank of India (RBI) guidelines.

---

### Section 5: Weekly Ordering Cycle & Order Acceptance
5.1. **Ordering Window & Cutoff:** Easy Farm operates on a structured weekly cycle to enable our partner farmers to harvest produce according to exact household demand, completely eliminating retail food waste:  
- **Weekly Order Cutoff:** Every **Saturday at 11:00 PM**.  
- **Sunday Harvest Drop:** Deliveries occur every **Sunday by 6:00 PM**.  
5.2. **Order Confirmation:** An order is deemed accepted once digital payment is confirmed and an official Easy Farm Order ID (e.g., ORD-XXXXXX) is displayed on your screen and transmitted via confirmation email.  
5.3. **Orders Post-Cutoff:** Any order submitted after the Saturday 11:00 PM cutoff will automatically be scheduled for harvest and delivery on the subsequent Sunday cycle.  
5.4. **Right of Rejection:** Easy Farm reserves the right to cancel or reject orders in exceptional circumstances, including delivery addresses located outside our active launch corridor, inventory stock depletion, or identified system errors.

---

### Section 6: Delivery Arrangements & Serviceable Corridor
6.1. **Authoritative Launch Corridor:** Easy Farm currently delivers exclusively to registered residential gated communities, apartments, and households located within our active launch zone: **Ghatkesar & Pocharam, Hyderabad (Active)** (including Singapore Township, Sanskruti Township, Rajeev Gruha Kalpa, Modi Emerald Heights, Pocharam IT Corridor, and adjacent residential enclaves).  
6.2. **Doorstep Delivery Schedule:** All weekly orders are delivered on **Sunday between 8:00 AM and 6:00 PM**. Easy Farm does not offer instant 10-minute delivery; our model prioritizes harvest quality, freshness, and sustainable distribution.  
6.3. **Customer Availability & Handover:** Customers must be reachable via phone during the Sunday delivery window. Delivery handover is completed through doorstep drop, designated apartment security check-in, or secure 4-digit OTP verification where requested.  
6.4. **Failed Delivery Attempts:** If a delivery cannot be completed due to an incorrect address provided by the customer, customer unreachability, or security gate denial, our dispatch team will contact you. Unclaimed perishable produce cannot be restocked once dispatched and will be managed in accordance with Section 7.  
6.5. **Exceptional Delays:** In the event of force majeure occurrences, severe weather, regional road closures, or vehicle breakdowns, our team will proactively notify you via WhatsApp or SMS with revised arrival estimates.

---

### Section 7: Order Cancellation Policy
7.1. **Cancellation Before Cutoff:** Customers may cancel their weekly box order at any time **before Saturday 11:00 PM** directly through their Customer Account portal or by messaging our support team. A 100% full refund will be processed immediately.  
7.2. **Orders After Cutoff:** Because our partner farmers commence plucking, sorting, and packing your specific vegetables on Saturday night and early Sunday morning, **cancellations are strictly not permitted after Saturday 11:00 PM**.  
7.3. **Admin Cancellation:** If Easy Farm must cancel an order due to unforeseen operational or crop availability constraints, you will be notified immediately and issued a 100% refund to your original payment method.

---

### Section 8: Refunds & Product Quality Complaints
8.1. **Inspection on Delivery:** Customers are advised to inspect their vegetable basket upon arrival.  
8.2. **Reporting Quality Concerns:** If any item in your box is damaged, spoiled, missing, or substandard, you must report the issue within **24 hours of delivery (by Monday 6:00 PM)** to our support team at **easyfarmsupport@gmail.com** or via WhatsApp at **+91 98490 12345**, accompanied by clear photographs of the affected produce.  
8.3. **Resolution & Refund Processing:** Upon rapid verification by our operations team:  
- A pro-rata refund for the affected item will be credited to your original payment method via Razorpay within 5 to 7 banking days; or  
- Instant Easy Coins reward points (₹1 per coin) will be credited to your customer wallet for immediate use on your next order, at your choice.  
8.4. **Non-Refundable Scenarios:** Quality complaints lodged after the 24-hour window, or issues arising from improper post-delivery vegetable storage in the customer's home, are not eligible for refund.

---

### Section 9: Easy Coins Loyalty Program
9.1. **Program Overview:** Easy Coins is our customer rewards system designed to reward consistent healthy eating.  
9.2. **Earning Coins:** Customers earn Easy Coins on eligible completed orders (default rate: 10 coins per ₹100 spent) and through promotional milestones. Coins are credited to your account upon successful delivery completion.  
9.3. **Reward Redemption:** Easy Coins can be redeemed for physical essential pantry products (e.g., cold-pressed oils, organic pulses, natural jaggery) directly at checkout, subject to item stock availability.  
9.4. **Restrictions:** Easy Coins carry no direct monetary cash withdrawal value and cannot be transferred to bank accounts or third-party users. Coins cannot be converted into cash.  
9.5. **Adjustments & Forfeiture:** If an order is cancelled or refunded, any Easy Coins awarded for that order will be deducted from your coin balance. Fraudulent acquisition of coins will result in immediate forfeiture and account termination.

---

### Section 10: Weekly Streak & Milestone Rewards
10.1. **Streak Definition:** The Weekly Streak loyalty system rewards customers who maintain consecutive weekly vegetable orders.  
10.2. **Weekly Stamp:** One qualifying stamp is awarded per weekly ordering cycle after successful doorstep delivery.  
10.3. **Streak Calculation & Reset:** Each consecutive qualifying weekly order increases your streak count by 1. If you skip or miss an order cycle, your active streak resets to 0 (subject to configured holiday freeze rules managed in the platform).  
10.4. **Milestone Rewards:** Reaching designated streak milestones (e.g., 4-week, 8-week, 12-week streaks) unlocks milestone discount coupons and priority farm benefits.  
10.5. **Dynamic Milestone Rules:** Specific milestone tiers, discount percentages, and minimum order values are managed dynamically through the Easy Farm Admin Panel and do not constitute permanent contractual terms.  
10.6. **Non-Stacking:** Streak milestone discount codes cannot be stacked with conflicting promotional coupons unless explicitly enabled by Easy Farm.

---

### Section 11: Coupons & Promotional Offers
11.1. **Coupon Eligibility:** Promotional coupons, introductory codes (e.g., FIRSTFARM, NEW20, EASY50), and referral rewards are subject to specific minimum order values and validity windows.  
11.2. **One Code Per Order:** Unless otherwise specified, only one promotional coupon code can be applied per checkout transaction.  
11.3. **Modification:** Easy Farm reserves the right to modify, cancel, or withdraw promotional codes at its discretion in the event of suspected abuse.

---

### Section 12: Customer Responsibilities & Acceptable Use
12.1. **Accurate Information:** Customers must provide true, complete, and accurate address, phone, and building details to facilitate reliable delivery.  
12.2. **Respectful Engagement:** Customers must interact courteously and professionally with delivery partners and support staff. Abusive language or harassment will lead to immediate account suspension.  
12.3. **Prohibited Activities:** Customers must not:  
- Use the platform for any unlawful, fraudulent, or unauthorized purpose;  
- Attempt to interfere with, reverse engineer, or compromise the platform's security;  
- Place speculative, fictitious, or false orders.

---

### Section 13: Complaints, Customer Support & Grievance Redressal
13.1. **Customer Support:** For order inquiries, feedback, or delivery questions, you may reach our team via:  
- **Email:** easyfarmsupport@gmail.com  
- **Phone:** +91 40 8899 7766  
- **WhatsApp Support:** +91 98490 12345  
- **Operational Hours:** Monday to Saturday: 9:00 AM – 7:00 PM; Sunday: 7:00 AM – 8:00 PM  
13.2. **Grievance Redressal Officer:** In accordance with the Information Technology Act, 2000 and the Consumer Protection (E-Commerce) Rules, 2020, our designated Grievance Officer details are:  
- **Designation:** Grievance Officer, Easy Farm  
- **Email:** grievance@easyfarm.co.in  
- **Address:** Easy Farm Distribution Hub, Ghatkesar & Pocharam, Hyderabad, Telangana – 500088  
- **Acknowledgement & Resolution:** Grievances are acknowledged within 48 hours and resolved within one month of receipt.

---

### Section 14: Platform Availability, Maintenance & Modifications
14.1. **Service Continuity:** We endeavor to keep our platform operational 24/7. However, temporary interruptions may occur due to scheduled maintenance, software updates, or infrastructure contingencies.  
14.2. **Platform Enhancements:** Easy Farm reserves the right to update, modify, or discontinue features, baskets, or catalogue items at any time without prior liability.

---

### Section 15: Limitation of Liability & Governing Law
15.1. **Liability Cap:** To the maximum extent permitted by applicable Indian law, Easy Farm's total cumulative liability arising out of any order shall not exceed the actual amount paid by the customer for that specific order.  
15.2. **Statutory Rights:** Nothing in these Terms shall limit or exclude any statutory consumer rights that cannot be lawfully excluded under the Consumer Protection Act, 2019.  
15.3. **Governing Law & Jurisdiction:** These Terms shall be governed by, and construed in accordance with, the laws of the Republic of India. Any legal dispute or proceeding arising under or in connection with these Terms shall be subject to the exclusive jurisdiction of the competent courts in **Hyderabad, Telangana, India**.

---

### Section 16: Policy Updates & Renewed Acceptance
16.1. **Modifications:** Easy Farm reserves the right to update or revise these Terms & Conditions periodically to reflect regulatory, technical, or commercial developments.  
16.2. **Notice & Renewed Acceptance:** When material amendments are published, Easy Farm will update the effective date and notify customers through the platform or via email. Customers will be prompted to explicitly review and accept the revised Terms upon their next account access.  
16.3. **Continued Usage:** Continued use of our platform following publication of updated terms signifies your agreement to the modified Terms.
`;

export const DEFAULT_PRIVACY_POLICY = `
# Privacy Policy

**Effective Date:** November 11, 2026  
**Document Version:** 1.0  
**Platform:** Easy Farm (easyfarm.co.in)  
**Applicability:** Website & Mobile Application  

---

### Section 1: Introduction & Privacy Commitment
1.1. Easy Farm ("Easy Farm", "we", "our", or "us") is dedicated to protecting the privacy and personal data of our customers ("you" or "your").  
1.2. This Privacy Policy describes how we collect, process, store, and safeguard your personal information when you access our website (**easyfarm.co.in**) and related digital mobile interfaces.  
1.3. We handle your personal data in accordance with the Information Technology Act, 2000, the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011 (SPDI Rules), and the Digital Personal Data Protection Act (DPDPA), 2023.

---

### Section 2: Information We Collect
We collect only the information strictly necessary to provide fresh vegetable delivery services:
2.1. **Account Identification Information:** Full name, primary contact mobile number, and email address.  
2.2. **Delivery Address Information:** Apartment or gated community name, building/tower, flat number, street locality, PIN code, and optional GPS coordinates to ensure accurate doorstep delivery within our active delivery corridor (**Ghatkesar & Pocharam, Hyderabad**).  
2.3. **Order & Harvest Information:** Basket selections (Staple Box, Custom Box), customized vegetable choices, order values, delivery dates, and delivery handover status.  
2.4. **Payment Transaction References:** Transaction identifiers, Razorpay Order IDs, and payment confirmation statuses. *Note: Easy Farm never stores complete card numbers, CVVs, expiration dates, or bank passwords.*  
2.5. **Loyalty Program Records:** Easy Coins balance, coin transaction history, physical gift redemptions, weekly order streak count, and milestone reward achievements.  
2.6. **Customer Communications:** Support messages, feedback, and photograph attachments provided when reporting produce quality concerns.

---

### Section 3: How Information is Collected
3.1. **Directly From You:** We collect information that you explicitly submit when creating an account, entering your address, selecting vegetable baskets, placing an order, or contacting customer support.  
3.2. **OTP Authentication:** When you request an OTP to log in or register, your mobile number or email is verified directly through Supabase authentication services.  
3.3. **Device Geolocation:** We access your device location only when you explicitly grant browser geolocation permissions to pinpoint your delivery building on our interactive map. Geolocation access is never gathered covertly.

---

### Section 4: How We Use Your Information
We process your personal information strictly for legitimate service delivery purposes:
4.1. **Account Administration:** Registering your customer profile, authenticating logins via OTP, and maintaining your account credentials.  
4.2. **Fulfillment & Sourcing:** Aggregating vegetable demand to notify our regional partner farmers in Telangana for Saturday harvesting, packing your crate, and routing Sunday delivery.  
4.3. **Transactional Notifications:** Sending vital service messages including order confirmations, dispatch updates, 4-digit OTP handover codes, and delivery receipts.  
4.4. **Customer Support:** Resolving product quality concerns, refund requests, and delivery inquiries.  
4.5. **Loyalty Administration:** Computing your Weekly Streak stamps, crediting Easy Coins, and applying valid milestone discounts at checkout.  
4.6. **Platform Security:** Preventing fraudulent transactions, duplicate coupon claims, and unauthorized account access.

---

### Section 5: Payment Information & Financial Security
5.1. **Razorpay Integration:** All payment processing on Easy Farm is managed securely through **Razorpay Software Private Limited**, an RBI-authorized payment aggregator compliant with the Payment Card Industry Data Security Standard (PCI-DSS Level 1).  
5.2. **No Storage of Sensitive Card Credentials:** During checkout, your payment credentials are transmitted directly to Razorpay's encrypted vault. Easy Farm never has access to, nor stores, your 16-digit card number, CVV code, net banking credentials, or UPI MPIN.

---

### Section 6: Easy Coins & Weekly Streak Loyalty Information
6.1. To operate our loyalty programs, Easy Farm maintains an immutable record of your qualifying weekly deliveries, stamp allocations, consecutive streak cycles, earned Easy Coins, and reward redemptions.  
6.2. This data is processed strictly to maintain transparent loyalty accounting and reward your consistent patronage.

---

### Section 7: Cookies & Local Device Storage
7.1. **Essential Local Storage:** Easy Farm uses browser local storage ('localStorage') solely to maintain essential session state, including your active delivery zone selection, shopping cart contents, and customer session token.  
7.2. **No Third-Party Advertising Trackers:** Easy Farm does not use invasive third-party tracking cookies or advertising data-broker pixels to track your activity across unrelated websites.

---

### Section 8: Third-Party Technical Service Providers
We partner with trusted enterprise technical infrastructure providers to operate the Easy Farm platform:
8.1. **Supabase Inc.:** Enterprise cloud database and authentication provider, providing secure, encrypted database storage and role-based access controls.  
8.2. **Razorpay Software Private Limited:** Authorized payment gateway provider for digital checkout and automated refund processing.  
8.3. **Resend Inc.:** Transactional email delivery service used to dispatch order confirmations, receipts, and OTP verification codes.  
8.4. **OpenStreetMap / Nominatim:** Mapping and geocoding services used to translate coordinates into local apartment and street addresses.  
*All third-party technical partners are bound by strict data processing confidentiality obligations and are prohibited from using your data for independent purposes.*

---

### Section 9: Information Sharing & Disclosure
9.1. **Delivery Personnel:** We share your delivery address, flat number, customer name, and contact phone number with our authorized Sunday dispatch and delivery team solely to complete doorstep drops.  
9.2. **No Sale of Personal Data:** Easy Farm does not sell, rent, lease, or monetize your personal information to third-party marketing or advertising networks under any circumstances.  
9.3. **Legal Requirements:** We may disclose your information only if required to do so by a court of competent jurisdiction, regulatory authority, or applicable law enforcement agency pursuant to lawful process.

---

### Section 10: Data Security & Protection Safeguards
10.1. **Technical Safeguards:** We implement robust technical measures including Transport Layer Security (TLS 1.3 / HTTPS encryption) for all data in transit, database encryption at rest, and Supabase Row Level Security (RLS) policies that isolate customer records.  
10.2. **Access Control:** Only authorized operational personnel with verified administrative roles have access to customer delivery information.  
10.3. **Disclaimer:** While we implement enterprise-grade security protocols, no method of digital transmission or electronic storage is completely impenetrable. We encourage customers to safeguard their login devices and access credentials.

---

### Section 11: Data Retention & Archival Policies
11.1. **Active Accounts:** Personal account details are retained for as long as your customer account remains active.  
11.2. **Statutory Retention:** Order histories, invoice records, and financial transaction references are retained for the statutory period required under Indian taxation and accounting laws (typically 8 financial years).  
11.3. **Data Erasure:** Upon receiving a verified account deletion request, non-statutory personal data will be securely purged or anonymized within 30 days.

---

### Section 12: Your Privacy Rights & Choices
Under applicable Indian data protection principles, you possess the right to:
12.1. **Access & Review:** Inspect the personal profile information associated with your Easy Farm account through your Account Settings page.  
12.2. **Correction & Update:** Correct or update your name, phone number, and delivery addresses at any time.  
12.3. **Withdraw Consent & Account Closure:** You may request account deletion or withdraw consent for non-essential communications by writing to **easyfarmsupport@gmail.com**.

---

### Section 13: Children’s Privacy Safeguards
13.1. Easy Farm's services are designed and marketed exclusively for adult customers (aged 18 and older). We do not knowingly collect or solicit personal information from children under the age of 18. If we learn that a minor's information has been collected without parental consent, we will promptly delete it.

---

### Section 14: Modifications to this Privacy Policy
14.1. We may update this Privacy Policy from time to time to reflect operational, technological, or regulatory developments.  
14.2. Any material updates will be accompanied by an updated version number, revision notes, and an updated effective date. When required by applicable law, your explicit renewed acknowledgement will be requested upon platform login.

---

### Section 15: Privacy Grievance Officer & Contact Information
15.1. In accordance with the Information Technology Act, 2000 and the Rules framed thereunder, any questions, comments, or complaints regarding this Privacy Policy or our data practices should be directed to our designated Grievance Officer:  
- **Designation:** Privacy & Grievance Redressal Officer  
- **Entity:** Easy Farm  
- **Email:** grievance@easyfarm.co.in  
- **Support Email:** easyfarmsupport@gmail.com  
- **Support Phone:** +91 40 8899 7766  
- **Address:** Easy Farm Distribution Hub, Ghatkesar & Pocharam, Hyderabad, Telangana – 500088  
15.2. We are committed to acknowledging your privacy grievances within 48 hours and resolving them in an expeditious, transparent manner.
`;
