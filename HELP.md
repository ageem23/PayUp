# PayUp — Help

*Good food, good friends, no awkward math.*

PayUp takes a restaurant bill and figures out who owes whom. Snap the receipt, mark who shared what, and PayUp does the splitting — including tax and tip — then tells everyone the simplest way to settle up.

This guide covers the five things you'll do most:

1. [Account setup](#1-account-setup)
2. [Creating trips](#2-creating-trips)
3. [Inviting additional users](#3-inviting-additional-users)
4. [Editing receipts](#4-editing-receipts)
5. [Settling up](#5-settling-up)

---

## 1. Account setup

**Sign in.** On the home page you have two options:

- **Continue with Google** — one click, nothing to remember.
- **Log in / Register with email** — choose **Register** to create a new account with an email and password, or **Log in** if you already have one.

Anyone can sign up — you don't need an invitation to use PayUp.

**Set up your profile.** Open the **account menu** (top of the screen) and go to your account settings to:

- Set a **display name** so friends see your name instead of your email.
- Add a **profile picture**.
- Pick your **theme and accent color** — these are saved to your account and follow you to any device.
- Change your **email or password**, or **log out**.

---

## 2. Creating trips

A **trip** groups the receipts you want to split together — a dinner, a weekend away, a group takeout order.

1. From your **Dashboard**, choose **New Trip**.
2. Give it a **name** (e.g. "Saturday dinner").
3. Add the **participants** — the people sharing the bill. You can type several at
   once separated by spaces; each name becomes a removable chip you can fix or
   delete before creating the trip.
4. Open the trip to start adding receipts.

Your **Dashboard** shows your own trips alongside any a friend shared with you
(labeled *Shared by <name>*). Once a trip is finished you can mark it **completed**
to tuck it away — see [Settling up](#5-settling-up).

**Managing participants later:** open a trip and use its **Participants** section
to add or remove people at any time — the trip owner and members can both edit the
list. If you try to remove someone who's already set as a payer or assigned to an
item, PayUp blocks it and names the receipt to fix first; reassign those, then
remove.

**Adding a receipt to a trip:**

1. Inside the trip, **add a receipt**.
2. **Take a photo** with your phone camera, or **upload / drag in** an image (JPG or PNG).
3. PayUp scans it and fills in the line items automatically — and, when it can read them, the merchant name, tax, and tip.
4. Give the receipt a quick look and correct anything the scan got wrong (see [Editing receipts](#4-editing-receipts)).

> **Free tier:** everyone can create and join trips for free, with up to **3 receipts per rolling 7 days**. If you hit the limit, you'll see when it resets and can request unlimited access.

---

## 3. Inviting additional users

Trips are better shared — invite the people you ate with so everyone can assign their own items.

1. Open the trip and find its **invite link**.
2. **Share the link** with your friends (text, chat, however you like).
3. When a friend opens the link and **signs in** (Google or email), they **join the trip** as a member.

Once they've joined, members can view the trip and edit its receipts — assign items to themselves, fix a price, and so on. You don't have to be the trip's creator to help clean up the receipt.

**Tips:**

- A friend has to **sign in** to join — the invite link adds them to the trip after they authenticate.
- If someone says they "can't see the trip," make sure they opened the invite link and signed in.

---

## 4. Editing receipts

Scans aren't perfect, so every receipt is fully editable. Open a receipt to make changes:

- **Rename the receipt** (e.g. "Dinner" → "Tony's Pizza").
- **Edit a line item** — fix its name or price.
- **Add a line item** the scan missed.
- **Delete a line item** that isn't real. (Deleting an item also removes it from anyone it was assigned to, so there are no leftover splits.)
- **Set who paid** — choose the person who actually covered the bill, so settle-up knows who's owed.
- **Assign items** — use the grid to check off who shared each item. An item split by two people is divided between them; an item only one person ordered is theirs alone.
- **Multi-quantity items** are split for you — a line like *3 × Taco $10.00* is scanned as three separate items (price divided evenly, to the cent) so each unit can go to a different person.
- **Tax and tip** are filled from the scan when possible and can be edited; PayUp spreads them **proportionally** to what each person ordered.

Edits save as you go and update the totals immediately. If others are in the same trip, they'll see the changes live.

To remove a whole receipt, use its **delete** action and confirm — it's removed from the trip and the settle-up.

---

## 5. Settling up

Once the receipts are entered and items are assigned, open the trip's **Settle Up** view.

PayUp adds up everyone's share — items, plus their proportional tax and tip — and compares it to what each person actually paid. Then it shows the **simplest set of payments** to square the group: who pays whom, and exactly how much, using the fewest transactions possible (no one makes three separate transfers when one will do).

**How to read it:**

- Each line is a single payment: *Person A pays Person B $X.*
- Pay those amounts however you normally do (your payment app of choice), and everyone's even.

**Marking a trip done.** Once everyone's settled, the trip owner can **mark the trip
completed**. Completed trips drop off your active dashboard; tick **Show completed**
there to see them again, or mark a trip active to bring it back.

**If the numbers look off:**

- Check that the **right person is set as the payer** on each receipt.
- Make sure **every item is assigned** to someone — unassigned items can skew shares.
- Confirm **tax and tip** are correct on each receipt.

---

## Questions or problems?

Open an issue on [GitHub](https://github.com/ageem23/PayUp/issues).
