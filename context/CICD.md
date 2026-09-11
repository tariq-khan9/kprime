# CI/CD Setup — What We Did and Why

How code goes from a push on `main` to running on the VPS, and why each piece exists.

---

## Step 1 — Take stock

Before automating anything, we wrote down what actually exists: where the project lives on the
server, which containers run, which URLs prove the site is alive, and how much memory and disk
we have to work with. Automation is just a script doing what you'd do by hand, so if we don't
know the real paths and commands, the script will be written against guesses. Fifteen minutes
here saved hours of debugging later.

**In our case:** project at `/home/tariq/kprime`, four containers, health at ports 9000 and
8000, 7.8GB RAM with 2GB swap, 85GB free disk. We also found `.env` was world-readable and
tightened it.

---

## Step 2 — Create a deploy user and SSH key

GitHub needs a way to log into the server. We gave it a dedicated account called `deploy`
instead of using the personal login, with its own SSH key used for nothing else. If that key
ever leaks, we revoke one account and one key — the personal login is untouched. The server
logs also show clearly which actions were GitHub and which were a human.

**In our case:** created `deploy`, added it to the `docker` and `tariq` groups so it can run
containers and edit project files, generated a key pair on Windows, and installed the public
half on the server.

---

## Step 3 — Store the secrets in GitHub

The pipeline needs the server address, the username, and the private key — none of which can
sit in the repository, because anyone who can read the code would then be able to log into the
server. GitHub has an encrypted secrets store for exactly this. Once saved, secrets can never
be read back, and they're hidden from logs automatically.

**In our case:** four connection secrets plus four build-time values the storefront needs
(backend URL, publishable key, site URL, WhatsApp number).

---

## Step 4 — A workflow that only runs tests

We built the checking half first, with no deploying attached. This is deliberate: a workflow
that can't touch the live site is safe to get wrong, so we could confirm the tests actually run
on a clean machine before trusting them to gate anything. We then broke a test on purpose to
prove the pipeline goes red — a check that has only ever passed hasn't been tested.

**In our case:** every push to `main` now installs dependencies, lints, runs 123 unit tests, and
does a full production build. Around two and a half minutes. When we broke a test, the build
step never ran — which is the exact behaviour the deploy depends on.

---

## Step 5 — A deploy script, run by hand first

The instructions for deploying live in a script on the server, not inside the pipeline
configuration. This matters because a script can be run manually whenever we want, so fixing it
takes seconds instead of a push-and-wait cycle. We ran it by hand repeatedly until it worked
before letting GitHub anywhere near it.

**In our case:** the script backs up the database, saves a copy of the current images so we can
go back, pulls the new code, rebuilds one service at a time to stay within memory, runs database
migrations, restarts, and then checks the site responds. If the check fails, it puts the old
version back automatically.

---

## Step 6 — Connect the two

The final step joins them: tests run first, and the deploy only starts if they pass. This is the
whole point of the exercise — broken code physically cannot reach the server, because the deploy
job never begins. We also made deploys queue rather than overlap, so two quick merges can't have
two builds fighting over the same machine.

**In our case:** pushing to `main` now runs the tests, and on green, GitHub logs into the VPS as
`deploy` and runs the script. What used to be a manual sequence is one `git push`.

---

## What it looks like now

```
git push origin main
        ↓
   tests run  ──── fail ───→ nothing happens, site untouched
        ↓ pass
   deploy runs
        ↓
   backup → build → migrate → restart → health check
        ↓ unhealthy
   automatic rollback
```

---

## Still worth doing

- **Branch protection** — right now a push with failing tests still lands on `main`; the deploy
  is skipped, but the broken code is in the repo. Requiring pull requests and passing checks
  closes that.
- **A manual approval gate** — GitHub Environments can pause the deploy and wait for a click,
  useful once there are real customers.
- **Restore the backup once** — a backup that has never been restored is a guess, not a safety
  net.
