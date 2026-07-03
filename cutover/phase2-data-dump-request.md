# Phase 2 data-dump request (for Manus)

> **OUTCOME (2026-07-01):** dump received (86 MB, `local-data/`). Manus ran its own
> ad-hoc queries instead of the block below (4 errored on column mismatches), so
> the diagnostics were re-run locally against the snapshot with
> `local-data/analyze_snapshot.py`. Results + the built/rehearsed Phase-2 SQL are
> summarized in [README.md](README.md). This request file is kept for the record /
> future re-dumps.

---


**Purpose:** unblock the identity consolidation (Phase 2 cutover). We need a
point-in-time copy of the live data so we can rehearse the dedupe + constraint
migration on a real snapshot and prove it applies cleanly before we run it in
production. Nothing below changes production — it is read-only export + reporting.

The prompt to hand Manus is in the box below. Paste it verbatim.

---

## PROMPT FOR MANUS

> **Read-only data export for a database migration rehearsal. Do not modify,
> migrate, or alter any table, index, or row in production. Export only.**
>
> I need two things from the production MySQL database, as downloadable files.
>
> ### 1. A consistent snapshot dump (preferred: whole DB)
> Produce a single-transaction `mysqldump` so the snapshot is internally
> consistent (all tables captured at the same point in time):
>
> ```bash
> mysqldump \
>   --single-transaction --quick --skip-lock-tables \
>   --routines --triggers --events \
>   --hex-blob \
>   <DATABASE_NAME> > peptidecoach_snapshot_<YYYYMMDD>.sql
> ```
>
> If a full-database dump is not permitted, dump **at minimum** these tables
> (schema **and** data) with the same flags:
>
> `contacts`, `clients`, `users`, `client_protocols`, `protocol_comments`,
> `appointments`, `client_packages`, `client_projects`, `custom_orders`,
> `packing_slips`, `prospects`, `protocol_orders`, `transformation_enrollments`
>
> Give me the resulting `.sql` file (gzip is fine).
>
> ### 2. A diagnostics report
> Run the SQL below **as-is** (all read-only `SELECT`s) and return the full
> output as a text/CSV file, labeled by query letter. Do not stop on empty
> results — an empty result is a valid answer, include it.
>
> ```sql
> -- A. Row counts
> SELECT 'contacts' tbl, COUNT(*) n FROM contacts
> UNION ALL SELECT 'clients', COUNT(*) FROM clients
> UNION ALL SELECT 'users', COUNT(*) FROM users
> UNION ALL SELECT 'client_protocols', COUNT(*) FROM client_protocols
> UNION ALL SELECT 'protocol_comments', COUNT(*) FROM protocol_comments;
>
> -- B. Duplicate emails in contacts (normalized: trimmed + lowercased).
> --    These are the rows that must be merged before UNIQUE(email) can apply.
> SELECT LOWER(TRIM(email)) email_norm, COUNT(*) n
> FROM contacts
> WHERE email IS NOT NULL AND TRIM(email) <> ''
> GROUP BY LOWER(TRIM(email)) HAVING COUNT(*) > 1
> ORDER BY n DESC;
>
> -- C. Contacts with no usable email (NULL is allowed under UNIQUE; '' is NOT).
> SELECT
>   SUM(email IS NULL)            AS null_email,
>   SUM(TRIM(email) = '')         AS blank_email,   -- must be converted to NULL
>   SUM(email IS NOT NULL AND TRIM(email) <> '') AS has_email
> FROM contacts;
>
> -- D. contactId FK integrity across every table that carries it.
> --    null_contactid = rows with no contact yet; orphaned = points at a
> --    contact id that does not exist (would break the FK).
> SELECT 'appointments' tbl, SUM(t.contactId IS NULL) null_contactid,
>        SUM(t.contactId IS NOT NULL AND c.id IS NULL) orphaned, COUNT(*) total
>   FROM appointments t LEFT JOIN contacts c ON c.id = t.contactId
> UNION ALL SELECT 'client_packages', SUM(t.contactId IS NULL),
>        SUM(t.contactId IS NOT NULL AND c.id IS NULL), COUNT(*)
>   FROM client_packages t LEFT JOIN contacts c ON c.id = t.contactId
> UNION ALL SELECT 'client_projects', SUM(t.contactId IS NULL),
>        SUM(t.contactId IS NOT NULL AND c.id IS NULL), COUNT(*)
>   FROM client_projects t LEFT JOIN contacts c ON c.id = t.contactId
> UNION ALL SELECT 'client_protocols', SUM(t.contactId IS NULL),
>        SUM(t.contactId IS NOT NULL AND c.id IS NULL), COUNT(*)
>   FROM client_protocols t LEFT JOIN contacts c ON c.id = t.contactId
> UNION ALL SELECT 'custom_orders', SUM(t.contactId IS NULL),
>        SUM(t.contactId IS NOT NULL AND c.id IS NULL), COUNT(*)
>   FROM custom_orders t LEFT JOIN contacts c ON c.id = t.contactId
> UNION ALL SELECT 'packing_slips', SUM(t.contactId IS NULL),
>        SUM(t.contactId IS NOT NULL AND c.id IS NULL), COUNT(*)
>   FROM packing_slips t LEFT JOIN contacts c ON c.id = t.contactId
> UNION ALL SELECT 'prospects', SUM(t.contactId IS NULL),
>        SUM(t.contactId IS NOT NULL AND c.id IS NULL), COUNT(*)
>   FROM prospects t LEFT JOIN contacts c ON c.id = t.contactId
> UNION ALL SELECT 'protocol_orders', SUM(t.contactId IS NULL),
>        SUM(t.contactId IS NOT NULL AND c.id IS NULL), COUNT(*)
>   FROM protocol_orders t LEFT JOIN contacts c ON c.id = t.contactId
> UNION ALL SELECT 'transformation_enrollments', SUM(t.contactId IS NULL),
>        SUM(t.contactId IS NOT NULL AND c.id IS NULL), COUNT(*)
>   FROM transformation_enrollments t LEFT JOIN contacts c ON c.id = t.contactId
> UNION ALL SELECT 'users', SUM(t.contactId IS NULL),
>        SUM(t.contactId IS NOT NULL AND c.id IS NULL), COUNT(*)
>   FROM users t LEFT JOIN contacts c ON c.id = t.contactId;
>
> -- E. Legacy clientId on client_protocols: how it splits across the two
> --    tables it historically pointed at (clients vs users), and how many null.
> SELECT
>   SUM(clientId IS NULL) AS null_clientid,
>   SUM(clientId IN (SELECT id FROM clients)) AS matches_clients,
>   SUM(clientId IN (SELECT id FROM users))   AS matches_users,
>   SUM(clientId IS NOT NULL
>       AND clientId NOT IN (SELECT id FROM clients)
>       AND clientId NOT IN (SELECT id FROM users)) AS matches_neither
> FROM client_protocols;
>
> -- F. Same person as BOTH a client and an auth user (email collision).
> SELECT COUNT(*) AS client_user_email_overlap
> FROM clients cl JOIN users u
>   ON LOWER(TRIM(cl.email)) = LOWER(TRIM(u.email))
> WHERE cl.email IS NOT NULL AND TRIM(cl.email) <> '';
>
> -- G. clients / users whose email has NO contact yet (a contact must be
> --    created for them during the collapse).
> SELECT 'clients_without_contact' src, COUNT(*) n
> FROM clients cl
> LEFT JOIN contacts c ON LOWER(TRIM(c.email)) = LOWER(TRIM(cl.email))
> WHERE cl.email IS NOT NULL AND TRIM(cl.email) <> '' AND c.id IS NULL
> UNION ALL
> SELECT 'users_without_contact', COUNT(*)
> FROM users u
> LEFT JOIN contacts c ON LOWER(TRIM(c.email)) = LOWER(TRIM(u.email))
> WHERE u.email IS NOT NULL AND TRIM(u.email) <> '' AND c.id IS NULL;
>
> -- H. Chat backfill readiness (Phase 3): protocol_comments whose parent
> --    protocol has a contactId vs not.
> SELECT
>   SUM(cp.contactId IS NOT NULL) AS resolvable_to_contact,
>   SUM(cp.contactId IS NULL)     AS unresolvable,
>   COUNT(*)                      AS total_comments
> FROM protocol_comments pc
> JOIN client_protocols cp ON cp.id = pc.clientProtocolId;
> ```
>
> **Deliver:** (1) the `.sql` snapshot file, (2) the diagnostics output file.
> Confirm the export was read-only and no production objects were changed.

---

## What each query tells us (for our side)

| Query | Unblocks |
|---|---|
| A | scale of the job; sanity-check the dump loaded fully |
| B | the dedupe worklist — every duplicate email must merge before UNIQUE(email) |
| C | `''` emails must become `NULL` (else UNIQUE rejects the second blank) |
| D | which FK adds will fail; NULL contactIds to backfill before STEP 3 NOT NULL |
| E | how to retire `clientId` — proves the clients/users split it straddled |
| F | contacts that are one person wearing two hats (client + login) |
| G | how many new contacts the collapse must mint |
| H | how much chat history the Phase 3 re-key can actually reconnect |

Once Manus returns both files: load the snapshot locally, run
`cutover/identity-constraints.sql` STEP-1/STEP-2 against it, and iterate the
dedupe script until STEP 3 applies with zero errors. That rehearsal is the
green light for scheduling the real cutover with Jason.
