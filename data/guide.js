/* Guide content. General information summarised from CDC, AAP, NIAID, FDA and ASCIA material.
   Not medical advice — always follow your own pediatrician's guidance. */

const SOURCES = [
  { t: "CDC — Foods and Drinks to Avoid or Limit (infants & toddlers)", u: "https://www.cdc.gov/infant-toddler-nutrition/foods-and-drinks/foods-and-drinks-to-avoid-or-limit.html" },
  { t: "AAP — HealthyChildren.org: Starting solid foods & feeding guidance", u: "https://www.healthychildren.org" },
  { t: "NIAID — Addendum guidelines for the prevention of peanut allergy in the US (2017)", u: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5217343/" },
  { t: "ASCIA — Infant feeding and allergy prevention (Australasian Society of Clinical Immunology and Allergy)", u: "https://allergy.org.au/hp/papers/infant-feeding-and-allergy-prevention" },
  { t: "AAP news release — Peanut allergies declined following early-introduction recommendation (2025)", u: "https://www.aap.org/en/news-room/news-releases/pediatrics2/2025/peanut-allergies-declined-following-recommendation-for-early-introduction" },
  { t: "Evidence summary: baby-led approach and choking risk (BLISS randomized trials)", u: "https://nutrition-evidence.com/article/260876/a-baby-led-approach-to-eating-solids-and-risk-of-choking" },
  { t: "FDA — Advice about eating fish (mercury levels by species)", u: "https://www.fda.gov/food/consumers/advice-about-eating-fish" }
];

/* Prep cheat-sheet: how the same food is prepared as baby grows. */
const PREP_MATRIX = [
  { type: "Hard fruit & veg (apple, pear, carrot, sweet potato, squash)",
    s1: "Steam / bake / roast until completely soft. Puree, mash, or soft thick sticks.",
    s2: "Steamed or roasted soft sticks and cubes; finely grated raw apple or carrot.",
    s3: "Finely grated or very thinly sliced raw; cooked soft pieces. Hard raw chunks and sticks not until about 4 years." },
  { type: "Soft ripe fruit (banana, avocado, mango, peach, melon)",
    s1: "Raw is fine: mash, or a large ripe wedge/spear (roll slippery pieces in crushed cereal).",
    s2: "Small soft pieces for pincer practice.",
    s3: "Bite-size pieces." },
  { type: "Berries & small round foods (blueberries, peas, grapes, cherry tomatoes)",
    s1: "Mash or smash each one flat. Grapes quartered and cherries pitted.",
    s2: "Halve or flatten; quarter grapes and tomatoes lengthwise.",
    s3: "Halve small berries; always quarter grapes and cherry tomatoes lengthwise (until about age 4)." },
  { type: "Leafy greens (spinach, kale)",
    s1: "Cook and blend into purees, eggs or porridge.",
    s2: "Cook and chop finely.",
    s3: "Cooked and chopped; raw baby spinach finely chopped in dishes." },
  { type: "Meat & poultry",
    s1: "Slow-cooked tender and shredded fine, pureed with broth, or a large soft strip to gnaw. Cook to safe temperature.",
    s2: "Minced, shredded, or tiny soft meatballs.",
    s3: "Tender bite-size pieces; avoid tough, dry chunks." },
  { type: "Fish & shellfish",
    s1: "Poach, bake or steam; flake and check all bones. Shellfish finely chopped or pureed.",
    s2: "Flaked fish, fish cakes; shellfish finely chopped.",
    s3: "Flaked or baked fish fingers; shellfish in small pieces." },
  { type: "Eggs",
    s1: "Hard-boiled and mashed, firm scrambled, omelet strips. No runny yolk.",
    s2: "Scrambled, strips, small pieces.",
    s3: "Any well-cooked style." },
  { type: "Beans & lentils",
    s1: "Cook very soft; mash or puree; smash each bean flat.",
    s2: "Smashed or halved; patties.",
    s3: "Whole soft cooked beans; halve chickpeas." },
  { type: "Nuts & seeds",
    s1: "Only as thin smooth butters, or finely ground powder stirred into foods. Never whole or chopped. Soak chia.",
    s2: "Thin spreads; ground seeds in foods.",
    s3: "Thin spreads. Whole nuts and big seeds not until about 4 years." },
  { type: "Grains & bread",
    s1: "Thin porridges, soft cooked grains; lightly toasted strips; large pasta shapes.",
    s2: "Soft pasta shapes, toast strips, grain patties.",
    s3: "Family grains and breads in bite-size pieces." }
];

/* Roadmap: what to try and when (general sequencing, flexible — babies vary). */
const ROADMAP = [
  { id: "r1", from: 0, to: 6.99, title: "First tastes", when: "First 1–2 weeks of solids (about 6 months)",
    goal: "Get comfortable with the spoon/finger foods. One small meal a day; milk stays the main food. Lead with iron-rich foods.",
    foods: ["infant_cereal", "beef", "chicken", "egg", "lentils", "avocado", "sweet_potato", "banana", "pear", "carrot"],
    how: "Offer a few spoonfuls or a soft strip when baby is calm and not too hungry or sleepy. Iron-rich food at least once a day. If baby is low-risk for allergy, there's no need to hold off on egg and peanut: introduce them in these first weeks (see Allergens)." },
  { id: "r2", from: 6, to: 7.99, title: "Build variety & allergens", when: "About 6–7 months",
    goal: "Move to 2–3 small meals. Work through the major allergens one at a time and keep repeating them. Rotate colours and food groups.",
    foods: ["peanut_butter", "egg", "yogurt", "bread", "pasta", "salmon", "tofu", "almond_butter", "tahini", "broccoli", "spinach", "oatmeal", "mango", "zucchini"],
    how: "Introduce a new allergen every few days, early in the day; keep offering ones already introduced about weekly or more. Bitter and green vegetables are accepted better with repeated, pressure-free offers, so keep going." },
  { id: "r3", from: 7, to: 8.99, title: "Textures, fingers & cup", when: "About 7–8 months",
    goal: "Thicker mashes, soft finger foods, practising an open or straw cup with meals. Add legumes, more fish, shellfish and gentle herbs and spices.",
    foods: ["black_beans", "chickpeas", "green_beans", "peas", "cod", "shrimp", "turkey", "quinoa", "cinnamon", "cumin", "blueberry", "strawberry"],
    how: "Let baby feed themselves as well as being spoon-fed. Expect gagging and mess. Move from smooth purees to mashed and lumpy foods rather than staying on smooth for months." },
  { id: "r4", from: 9, to: 11.99, title: "Lumpy foods & self-feeding", when: "9–11 months",
    goal: "3 meals plus 1–2 snacks, mostly family foods with no added salt or sugar. Chopped, soft pieces for the pincer grasp. Make sure textures keep progressing.",
    foods: ["cheese", "ricotta", "pancakes", "hummus", "white_beans", "lamb", "pork", "puffs", "cantaloupe", "mushroom"],
    how: "Eat together as a family where possible. Offer a mix of finger foods and a spoon. Keep repeating foods baby rejected (8–15 tries is common) and vary how they're prepared." },
  { id: "r5", from: 12, to: 999, title: "Toddler transition", when: "12 months and up",
    goal: "Three meals and snacks from the family table, cut to size. Whole cow's milk can replace formula/breast milk as the main drink (with your pediatrician's guidance); honey is no longer age-restricted.",
    foods: ["cow_milk", "honey", "strawberry", "grapes", "cheese", "yogurt"],
    how: "Keep allergens in the regular rotation. Keep choking-hazard rules until about age 4: quarter grapes, no whole nuts or popcorn, no raw hard chunks." }
];

/* Evidence-based feeding approaches. Evidence strength is a plain-language summary, not a formal grade. */
const EVIDENCE = [
  { t: "Introduce peanut and egg early, then keep them in the diet", s: "Strong",
    d: "Randomized trials (LEAP for peanut; EAT and other trials for egg) found introducing these allergens in infancy lowers allergy risk; waiting beyond 4–6 months has not been shown to protect. Guidelines from the NIAID, AAP and ASCIA follow this. High-risk babies (severe eczema, egg allergy) should be assessed by a doctor first." },
  { t: "Prioritise iron-rich foods from the start", s: "Strong (consensus)",
    d: "Breast milk is low in iron and a baby's own stores run down in the second half of the first year. Meat, fish, egg, beans, lentils, tofu and fortified cereal all help, and pairing plant iron with vitamin C improves absorption. Don't rely on fruit and vegetable purees alone." },
  { t: "Purees, baby-led weaning, or a mix: all can work", s: "Moderate",
    d: "Randomized trials of baby-led approaches (the BLISS studies in New Zealand) found no difference in growth between baby-led and spoon-fed babies, and no increase in choking when families were taught safe food shapes and how to tell gagging from choking. A mixed approach (some spoon-fed, some finger foods) is common and fine. What matters most is safe textures, iron-rich foods and baby leading the pace." },
  { t: "Responsive feeding: follow hunger and fullness cues", s: "Moderate",
    d: "Parents decide what, when and where; baby decides whether and how much. Pressuring, bribing or using food as a reward is linked in research with fussier eating and weaker appetite regulation. Stop when baby shows fullness cues." },
  { t: "Repeated, pressure-free exposure builds acceptance", s: "Moderate",
    d: "Studies of infants and toddlers show liking for new flavours, especially bitter vegetables, rises with repeated tastes. Many parents give up after 2–3 tries; research often cites around 8–15 exposures. Different preparations count too. A disliked food today is not a permanent dislike." },
  { t: "Offer a wide range of flavours and textures early", s: "Moderate / limited",
    d: "Early variety (including vegetables and, from 6 months, herbs and mild spices) is associated with broader acceptance later. Observational studies suggest that delaying lumpy textures well beyond about 9–10 months is linked to more feeding difficulties later, so keep progressing textures; this evidence is not from randomized trials." },
  { t: "Eat together and let baby self-feed", s: "Limited / expert guidance",
    d: "Family meals let baby copy eating, and self-feeding supports hand-mouth skills. Pediatric guidance encourages both, with the safety rules in the Guide." },
  { t: "Breast milk or formula remain the main drink until 12 months", s: "Strong (consensus)",
    d: "Solids add to, not replace, milk feeds in the first year. Water in small sips with meals; no juice before 12 months; cow's milk as a drink waits until after 12 months (CDC, AAP)." }
];

const GUIDE_SECTIONS = [
  { id: "roadmap", title: "Roadmap: what to try next", icon: "🧭", html: "ROADMAP" },
  { id: "evidence", title: "Best ways to feed: what the evidence says", icon: "🔬", html: "EVIDENCE" },
  { id: "ready", title: "Is baby ready for solids?", icon: "🪑", html: `
    <p>Most babies are ready around <b>6 months</b>. The CDC and AAP list these signs of readiness; look for <b>all</b> of them, not just one:</p>
    <ul>
      <li>Sits up with little or no support and holds their head steady</li>
      <li>Opens their mouth and leans forward when food approaches</li>
      <li>Shows interest in what you are eating, reaches for food</li>
      <li>The tongue-thrust reflex (pushing food out) is fading</li>
      <li>Can pick things up and bring them to their mouth</li>
    </ul>
    <p>Solids should not start before 4 months. Breast milk or formula stays the main source of nutrition until 12 months, and solids are a complement, not a replacement.</p>` },

  { id: "gag", title: "Gagging vs. choking", icon: "😮", html: `
    <p><b>Gagging is normal and protective.</b> Babies have a sensitive gag reflex that sits farther forward on the tongue, which helps keep food out of the airway. Gagging is noisy: coughing, sputtering, a red face, watery eyes, and they usually push the food forward on their own. Stay calm, stay close, and do not put your fingers in their mouth.</p>
    <p><b>Choking is silent and an emergency.</b> The airway is blocked: baby cannot cough, cry or make sound, may look panicked, turn blue or pale, or go limp. <b>Call 911 (or your local emergency number) and begin infant choking first aid immediately.</b></p>
    <div class="callout warn"><b>Strongly recommended:</b> take an infant CPR and choking-first-aid class from the Red Cross, American Heart Association or a local hospital <i>before</i> starting solids. Reading about it is not a substitute for practice.</div>` },

  { id: "setup", title: "Safe feeding setup", icon: "🛡️", html: `
    <ul>
      <li>Baby sits <b>upright</b> (90°) in a high chair with a footrest and straps, and is <b>never left alone</b> while eating.</li>
      <li>Never feed baby in the car, while walking or crawling, lying back, or while distracted or sleepy.</li>
      <li>Offer food one piece at a time; do not put food in baby's mouth for them with baby-led weaning (let baby control the pace).</li>
      <li>Avoid pouch-only feeding; offer purees on a spoon so baby practises mouth skills.</li>
      <li>Wash your hands and baby's hands before eating. Keep sauces/spreads thin so they don't form sticky clumps.</li>
      <li>Do not prop bottles. Do not put cereal in a bottle unless your pediatrician says to.</li>
    </ul>` },

  { id: "choking", title: "Top choking hazards (and how to make them safe)", icon: "⚠️", html: `
    <p>Children under 4 are at highest risk of choking on food that is <b>small, round, hard, sticky, or slippery</b>. Foods to avoid in their risky form, and safer versions:</p>
    <table class="tbl">
      <tr><th>Food</th><th>Avoid</th><th>Make it safe</th></tr>
      <tr><td>Grapes, cherry tomatoes, olives</td><td>Whole</td><td>Quarter lengthwise (pit olives and cherries)</td></tr>
      <tr><td>Hot dogs, sausages</td><td>Round slices or chunks</td><td>Quarter lengthwise, then cut small (and choose low-sodium)</td></tr>
      <tr><td>Whole nuts, large seeds, popcorn</td><td>Always, until around age 4</td><td>Thin nut butter, ground nuts/seeds</td></tr>
      <tr><td>Raw hard fruit and veg (apple, carrot, celery)</td><td>Chunks, sticks, coins</td><td>Cook soft; finely grate; paper-thin slices later</td></tr>
      <tr><td>Blueberries, peas, corn kernels, chickpeas</td><td>Whole when very young</td><td>Smash, halve or flatten</td></tr>
      <tr><td>Peanut butter and other sticky spreads</td><td>Spoonfuls, thick spread on a spoon or bread</td><td>Thin with water/milk or spread thin</td></tr>
      <tr><td>Cheese cubes, string cheese, meat chunks</td><td>Chunks</td><td>Thin slices, shred, small soft pieces</td></tr>
      <tr><td>Marshmallows, hard candy, gum, jelly cups</td><td>Always</td><td>Skip</td></tr>
      <tr><td>Whole dried fruit, chewy sticky foods</td><td>Whole</td><td>Soak/cook and puree or chop finely</td></tr>
      <tr><td>Fish and bone-in meat</td><td>Bones</td><td>Remove all bones, shell and gristle</td></tr>
      <tr><td>Dry chia, large pieces of dry cereal</td><td>Dry</td><td>Soak chia; use dissolvable puffs only after pincer grasp</td></tr>
    </table>` },

  { id: "avoid", title: "Foods & drinks to avoid or delay", icon: "🚫", html: `
    <ul>
      <li><b>Honey</b> — not before 12 months (infant botulism). Includes honey in baked goods, on pacifiers, and "honey graham" foods.</li>
      <li><b>Cow's milk as a drink</b> — not before 12 months. Cooking with it or yogurt/cheese is fine from 6 months.</li>
      <li><b>Juice</b> — none before 12 months (CDC). After that, 100% juice isn't needed; the AAP says no more than 4 oz/day for ages 1–3.</li>
      <li><b>Added sugars</b> — none under 24 months (CDC): sweetened yogurts, cookies, muffins, sweet drinks.</li>
      <li><b>Salt and very salty foods</b> — no added salt; avoid processed meats, canned soups, ready meals, salty snacks, and high-sodium cheeses. Rinse canned beans and vegetables.</li>
      <li><b>Raw or undercooked</b> eggs, meat, poultry, fish and shellfish; sushi; runny yolks.</li>
      <li><b>Unpasteurized</b> milk, yogurt, cheese, juice. Soft cheeses must be labelled pasteurized.</li>
      <li><b>High-mercury fish</b> — king mackerel, marlin, orange roughy, shark, swordfish, tilefish (Gulf of Mexico), bigeye tuna. Choose "Best Choice" fish like salmon, cod, trout, sardines, shrimp (FDA).</li>
      <li><b>Caffeinated drinks</b> — none under 24 months. No sugary drinks, soda, sports drinks or flavored water.</li>
      <li><b>Plant-based milks</b> are not a substitute for breast milk/formula before 12 months; ask your pediatrician.</li>
    </ul>` },

  { id: "allergy", title: "Food allergy: what to watch for", icon: "🩺", html: `
    <p><b>Mild/possible reactions</b> (usually within minutes to 2 hours): a few hives around the mouth or face, redness where food touched the skin, mild vomiting, new fussiness. Stop that food and call your pediatrician.</p>
    <p><b>Emergency signs — call 911:</b></p>
    <ul>
      <li>Trouble breathing, wheezing, persistent cough, hoarse cry</li>
      <li>Swelling of lips, tongue or face</li>
      <li>Hives over the body plus any other symptom (vomiting, pale, lethargic)</li>
      <li>Repeated vomiting, limp or very sleepy, pale or blue, floppy</li>
    </ul>
    <p>Reactions involving <b>two or more body systems</b> (skin + stomach, skin + breathing) suggest anaphylaxis. If your doctor has prescribed epinephrine, give it and call 911.</p>
    <p><b>Delayed reactions</b> such as <b>FPIES</b> (food protein-induced enterocolitis syndrome) can appear <b>1–4 hours</b> later with repeated forceful vomiting, pallor and lethargy. This is also an emergency.</p>
    <p>The "wait" between new foods: Traditional advice is 3–5 days between new single foods so that a reaction can be traced. Current guidance is more flexible, but spacing allergens (a couple of days apart) and introducing them early in the day when you can watch baby is still sensible. <b>Follow your pediatrician's plan.</b></p>
    <div class="callout">Introduce major allergens when baby is well, not during a cold, vaccine day or travel; offer at home, early in the day.</div>` },

  { id: "earlyallergen", title: "Early allergen introduction: the evidence", icon: "🥜", html: `
    <p>Current US guidance (AAP, NIAID) and Australasian guidance (ASCIA) recommend introducing common allergens, especially <b>peanut and egg</b>, <b>around 6 months and not delaying</b> them, because delayed introduction has not been shown to prevent allergy and early introduction of peanut lowers risk. The NIAID peanut guidelines (2017) sort infants by risk:</p>
    <ul>
      <li><b>Severe eczema and/or egg allergy:</b> talk to your pediatrician/allergist first; testing may be advised, and the first feeding may be done under medical supervision, at about 4–6 months.</li>
      <li><b>Mild-to-moderate eczema:</b> introduce peanut-containing foods around 6 months, at home.</li>
      <li><b>No eczema or food allergy:</b> introduce when ready for solids, in line with family preference.</li>
    </ul>
    <p><b>Keeping it up:</b> evidence for the ideal frequency is limited. NIAID's peanut guidance mentions about 2 g of peanut protein (roughly 2 tsp peanut butter) 3 or more times per week in the study babies; ASCIA's published guidance has recommended about twice a week (a newer ASCIA update reportedly reduced that to weekly). Many families aim for <b>roughly once or twice per week</b> per allergen. This app lets you set your own weekly target (Settings) and shows how many times each allergen was offered each week. <b>Ask your pediatrician what they recommend for your baby.</b></p>` },

  { id: "stages", title: "What changes with age: textures & amounts", icon: "📈", html: "STAGES" },

  { id: "prep", title: "Preparation by age: steamed → raw", icon: "🍳", html: "PREPMATRIX" },

  { id: "cooking", title: "Cooking, storing & reheating", icon: "🧼", html: `
    <ul>
      <li><b>Steaming</b> is the best all-round early method: it softens food completely and keeps more nutrients than boiling. Roasting adds sweetness and makes good finger foods. Boil or simmer for purees and lentils/beans. Make sure everything is <b>soft enough to squash between your fingers</b>.</li>
      <li><b>Safe internal temperatures:</b> poultry 165°F/74°C; ground meat 160°F/71°C; whole pork, beef, lamb and fish 145°F/63°C; eggs cooked firm.</li>
      <li><b>Wash</b> hands, surfaces and produce. Keep raw meat separate. Don't refreeze thawed food.</li>
      <li>Refrigerate leftovers within 2 hours. Home-made purees keep about 2–3 days in the fridge and about 3 months in the freezer (freeze in ice-cube trays).</li>
      <li>Don't feed straight from a jar or pouch and then save the rest: saliva introduces bacteria. Spoon a portion into a bowl instead.</li>
      <li>Reheat until steaming, stir, and let cool; check the temperature on your wrist (microwaves leave hot spots).</li>
      <li>Skip salt, sugar, honey and stock cubes. Use herbs, spices, citrus, garlic and onion for flavour.</li>
    </ul>` },

  { id: "nutrition", title: "Key nutrients: iron, vitamin D, variety", icon: "💪", html: `
    <ul>
      <li><b>Iron:</b> a baby's iron stores start to run low around 6 months, and breast milk is low in iron. Offer iron-rich foods daily: meat, poultry, fish, egg, beans and lentils, tofu, iron-fortified infant cereal. Pairing plant iron with vitamin-C foods (fruit, tomato, pepper) helps absorption.</li>
      <li><b>Vitamin D:</b> the AAP recommends 400 IU/day for breastfed babies (and formula-fed babies drinking under about 32 oz/day). Ask your pediatrician.</li>
      <li><b>Healthy fats</b> (avocado, fish, eggs, olive oil, full-fat yogurt) support brain growth. Don't offer low-fat or "diet" versions.</li>
      <li><b>Variety matters:</b> aim for different colours and food groups through the week. The FDA recommends rotating grains (not only rice, which can contain inorganic arsenic) and varying fruit/veg to reduce heavy-metal exposure from any single food.</li>
      <li><b>Water:</b> small sips with meals (the AAP suggests about 4–8 oz/day from 6–12 months).</li>
    </ul>` },

  { id: "cues", title: "Responsive feeding & picky eating", icon: "🙂", html: `
    <ul>
      <li><b>Hunger cues:</b> opening mouth, leaning toward food, reaching. <b>Fullness cues:</b> turning away, closing mouth, pushing food away, losing interest. Stop when baby shows these cues. Never force or bribe.</li>
      <li><b>New foods are often rejected at first.</b> Research suggests it can take <b>8–15 exposures</b> before a baby accepts a new flavour. Keep offering without pressure (the "tries" counter in this app helps).</li>
      <li>Funny faces, spit-outs and messes are normal learning, not necessarily dislike.</li>
      <li>Let baby feed themselves, explore with hands, and eat with the family.</li>
    </ul>` }
];
