import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const queries = [
  `CREATE TABLE IF NOT EXISTS prospects (
    id int AUTO_INCREMENT PRIMARY KEY,
    name varchar(255) NOT NULL,
    email varchar(255),
    phone varchar(50) NOT NULL,
    status enum('new','contacted','clicked','viewing','enrolled','declined','stalled') NOT NULL DEFAULT 'new',
    source varchar(100),
    notes text,
    accessCode varchar(100),
    trackingToken varchar(100) NOT NULL,
    lastContactedAt timestamp NULL,
    lastClickedAt timestamp NULL,
    lastViewedAt timestamp NULL,
    totalSmsSent int NOT NULL DEFAULT 0,
    totalClicks int NOT NULL DEFAULT 0,
    followUpCount int NOT NULL DEFAULT 0,
    nextFollowUpAt timestamp NULL,
    followUpPaused boolean NOT NULL DEFAULT false,
    enrollmentId int,
    userId int,
    smsOptOut boolean NOT NULL DEFAULT false,
    createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX prospects_status_idx (status),
    INDEX prospects_email_idx (email),
    INDEX prospects_phone_idx (phone),
    INDEX prospects_tracking_token_idx (trackingToken),
    INDEX prospects_next_followup_idx (nextFollowUpAt)
  )`,
  `CREATE TABLE IF NOT EXISTS sms_messages (
    id int AUTO_INCREMENT PRIMARY KEY,
    prospectId int,
    userId int,
    toPhone varchar(50) NOT NULL,
    fromPhone varchar(50) NOT NULL,
    body text NOT NULL,
    twilioSid varchar(100),
    status enum('queued','sending','sent','delivered','undelivered','failed','not_configured') NOT NULL DEFAULT 'queued',
    errorCode varchar(20),
    errorMessage text,
    direction enum('outbound','inbound') NOT NULL DEFAULT 'outbound',
    templateKey varchar(100),
    price varchar(20),
    createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX sms_messages_prospect_idx (prospectId),
    INDEX sms_messages_user_idx (userId),
    INDEX sms_messages_twilio_sid_idx (twilioSid),
    INDEX sms_messages_status_idx (status),
    INDEX sms_messages_created_at_idx (createdAt)
  )`,
  `CREATE TABLE IF NOT EXISTS prospect_engagement (
    id int AUTO_INCREMENT PRIMARY KEY,
    prospectId int NOT NULL,
    eventType enum('sms_link_click','page_view','masterclass_view','tier_view','enrollment_start','enrollment_complete') NOT NULL,
    url varchar(500),
    metadata text,
    ipAddress varchar(45),
    userAgent text,
    createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX prospect_engagement_prospect_idx (prospectId),
    INDEX prospect_engagement_event_type_idx (eventType),
    INDEX prospect_engagement_created_at_idx (createdAt)
  )`,
  `CREATE TABLE IF NOT EXISTS sms_templates (
    id int AUTO_INCREMENT PRIMARY KEY,
    templateKey varchar(100) NOT NULL,
    name varchar(255) NOT NULL,
    description text,
    body text NOT NULL,
    isActive boolean NOT NULL DEFAULT true,
    isDefault boolean NOT NULL DEFAULT false,
    category enum('initial_outreach','follow_up','reminder','custom') NOT NULL DEFAULT 'custom',
    sendAfterHours int,
    createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX sms_templates_key_idx (templateKey),
    INDEX sms_templates_category_idx (category)
  )`
];

for (const q of queries) {
  await conn.execute(q);
  console.log("✓ Created table:", q.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1]);
}

// Seed default SMS templates
const templates = [
  {
    key: "initial_intro",
    name: "Personal Introduction",
    desc: "Warm personal intro for prospects you know",
    body: "Hey {{name}}, it's Jason from Omega Longevity. I put together some info on our coaching programs I think you'd really like. Check it out here: {{link}}",
    category: "initial_outreach",
    isDefault: true,
  },
  {
    key: "masterclass_invite",
    name: "Masterclass Invitation",
    desc: "Invite to watch the masterclass video series",
    body: "Hey {{name}}, Jason here. I wanted to share our free masterclass on health optimization — it covers everything from peptides to longevity protocols. Take a look: {{link}}",
    category: "initial_outreach",
    isDefault: false,
  },
  {
    key: "followup_48h",
    name: "48-Hour Follow-Up",
    desc: "Gentle follow-up 48 hours after initial contact",
    body: "Hey {{name}}, just wanted to make sure you saw the link I sent about our coaching programs. Happy to answer any questions — just reply here or check it out: {{link}}",
    category: "follow_up",
    isDefault: true,
    sendAfterHours: 48,
  },
  {
    key: "followup_5d",
    name: "5-Day Follow-Up",
    desc: "Second follow-up 5 days after initial contact",
    body: "Hi {{name}}, circling back one more time. Our transformation programs have helped clients see real results in 90 days. If you're curious, the info is still here: {{link}}",
    category: "follow_up",
    isDefault: true,
    sendAfterHours: 120,
  },
];

for (const t of templates) {
  await conn.execute(
    `INSERT INTO sms_templates (templateKey, name, description, body, category, isDefault, sendAfterHours) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [t.key, t.name, t.desc, t.body, t.category, t.isDefault, t.sendAfterHours || null]
  );
  console.log("✓ Seeded template:", t.name);
}

await conn.end();
console.log("\n✅ All SMS tables created and seeded successfully!");
