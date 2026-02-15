const fs = require('fs')
const path = require('path')

const goldStandardPath = path.join(__dirname, '..', 'src', 'data', 'shl-gold-standard.json')

const newQuestions = [
  // ── 1. Point Graph: Share Price % Change ──
  {
    id: "graph_share_price_pct_real",
    subtype: "interactive_numerical",
    type: "interactive_point_graph",
    difficulty: "hard",
    instruction: "Graph the percentage change in share price compared to Day 1.",
    question: "For each day, graph the change in share price compared to Day 1.",
    prompt_rules: [
      "Day 1: $16.00",
      "Day 2: $15.20",
      "Day 3: $17.60",
      "Day 4: $13.60",
      "Day 5: $19.20"
    ],
    widget_data: {
      x_axis_labels: ["Day 2", "Day 3", "Day 4", "Day 5"],
      y_axis: { min: -20, max: 40, step: 10, label: "%" },
      initial_values: [0, 0, 0, 0]
    },
    correct_answer: { values: [-5, 10, -15, 20] },
    tolerance: { value: 2 },
    explanation: "From Day 1 ($16): Day 2=(15.20-16)/16=-5%. Day 3=(17.60-16)/16=+10%. Day 4=(13.60-16)/16=-15%. Day 5=(19.20-16)/16=+20%."
  },

  // ── 2. Point Graph: Monthly Revenue ──
  {
    id: "graph_monthly_revenue_real",
    subtype: "interactive_numerical",
    type: "interactive_point_graph",
    difficulty: "hard",
    instruction: "Graph the revenue of this company in subsequent months.",
    question: "Drag each month's point to the correct revenue figure.",
    prompt_rules: [
      "The revenue of a company was $160 million in January.",
      "February: Revenue decreased by $20 million compared to January.",
      "March: Revenue increased by $30 million compared to January.",
      "April: Revenue decreased by 6.25% compared to January.",
      "May: Revenue increased by 12.5% compared to January."
    ],
    widget_data: {
      x_axis_labels: ["Feb", "Mar", "Apr", "May"],
      y_axis: { min: 130, max: 200, step: 10, label: "$M" },
      initial_values: [160, 160, 160, 160]
    },
    correct_answer: { values: [140, 190, 150, 180] },
    tolerance: { value: 2 },
    explanation: "Jan=$160M. Feb=160-20=$140M. Mar=160+30=$190M. Apr=160*(1-0.0625)=$150M. May=160*(1+0.125)=$180M."
  },

  // ── 3. Point Graph: Accessories / Hats % ──
  {
    id: "graph_accessories_hats_real",
    subtype: "interactive_numerical",
    type: "interactive_point_graph",
    difficulty: "hard",
    instruction: "Graph the percentage of total sales that hats represent each year.",
    question: "Drag each year's point to show hats as a percentage of total accessory sales.",
    prompt_rules: [
      "Hats:    Year 1 = 450, Year 2 = 560, Year 3 = 294, Year 4 = 455, Year 5 = 544",
      "Scarves: Year 1 = 216, Year 2 = 247, Year 3 = 306, Year 4 = 368, Year 5 = 285",
      "Gloves:  Year 1 = 243, Year 2 = 324, Year 3 = 302, Year 4 = 395, Year 5 = 318",
      "Bags:    Year 1 = 591, Year 2 = 469, Year 3 = 498, Year 4 = 532, Year 5 = 553",
      "All figures are in thousands (000s)."
    ],
    widget_data: {
      x_axis_labels: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5"],
      y_axis: { min: 15, max: 40, step: 5, label: "%" },
      initial_values: [25, 25, 25, 25, 25]
    },
    correct_answer: { values: [30, 35, 21, 26, 32] },
    tolerance: { value: 2 },
    explanation: "Totals: Y1=1500, Y2=1600, Y3=1400, Y4=1750, Y5=1700. Hats%: Y1=450/1500=30%, Y2=560/1600=35%, Y3=294/1400=21%, Y4=455/1750=26%, Y5=544/1700=32%."
  },

  // ── 4. Point Graph: Office Space Cost ──
  {
    id: "graph_office_space_real",
    subtype: "interactive_numerical",
    type: "interactive_point_graph",
    difficulty: "hard",
    instruction: "Graph the cost per square foot to lease office space each month.",
    question: "Drag each month's point to the correct cost per square foot.",
    prompt_rules: [
      "In January, a company paid $2,625 to rent a 2,100 sq ft office.",
      "In February, the cost per sq ft increased by 20% over January.",
      "In March, the cost per sq ft increased by 50% over February."
    ],
    widget_data: {
      x_axis_labels: ["Jan", "Feb", "Mar"],
      y_axis: { min: 1.00, max: 2.50, step: 0.25, label: "$" },
      initial_values: [1.25, 1.25, 1.25]
    },
    correct_answer: { values: [1.25, 1.50, 2.25] },
    tolerance: { value: 0.05 },
    explanation: "Jan: $2625/2100=$1.25/sqft. Feb: $1.25*1.20=$1.50. Mar: $1.50*1.50=$2.25."
  },

  // ── 5. Stacked Bar: Managers by Gender ──
  {
    id: "bar_managers_gender_real",
    subtype: "interactive_numerical",
    type: "interactive_stacked_bar",
    difficulty: "hard",
    instruction: "Arrange the total number of managers and the male to female split for Year 2.",
    question: "Set Year 2's total and the male vs female percentage split.",
    prompt_rules: [
      "In Year 1, there were 80 managers with an equal number of male and female managers.",
      "From Year 1 to Year 2, the total number of managers increased by 20%.",
      "From Year 1 to Year 2, the number of female managers doubled."
    ],
    widget_data: {
      axis_max: 120,
      axis_step: 20,
      segment_labels: { primary: "Male", secondary: "Female" },
      bar_1: { id: "year_1", label: "Year 1", total: 80, split_pct: 50 },
      bar_2_initial: { id: "year_2", label: "Year 2", total: 50, split_pct: 50 }
    },
    correct_answer: { total: 96, split_pct: 17 },
    tolerance: { total: 3, split_pct: 2 },
    explanation: "Year 1: 80 total, 40 male / 40 female. Year 2 total=80*1.2=96. Female=40*2=80. Male=96-80=16. Male%=16/96≈17%."
  },

  // ── 6. Stacked Bar: Commuting to Work ──
  {
    id: "bar_commuting_real",
    subtype: "interactive_numerical",
    type: "interactive_stacked_bar",
    difficulty: "hard",
    instruction: "Set the total commuters and the private vs public transportation split for Year 2.",
    question: "Adjust Year 2's bar to show the correct total and transport mode split.",
    prompt_rules: [
      "In Year 1, 200,000 people commuted to work.",
      "40% of Year 1 commuters used public transportation.",
      "The number of people using public transportation increased by 15% from Year 1 to Year 2.",
      "In Year 2, there were 260,000 total commuters."
    ],
    widget_data: {
      axis_max: 300,
      axis_step: 50,
      segment_labels: { primary: "Private", secondary: "Public" },
      bar_1: { id: "year_1", label: "Year 1", total: 200, split_pct: 60 },
      bar_2_initial: { id: "year_2", label: "Year 2", total: 150, split_pct: 50 }
    },
    correct_answer: { total: 260, split_pct: 65 },
    tolerance: { total: 5, split_pct: 2 },
    explanation: "Year 1: 200k total, public=80k (40%), private=120k (60%). Year 2: 260k total, public=80k*1.15=92k, private=260k-92k=168k. Private%=168/260≈65%."
  },

  // ── 7. Tabbed Evaluation: Conference Expenses ──
  {
    id: "tab_conference_expenses_real",
    subtype: "interactive_numerical",
    type: "interactive_tabbed_evaluation",
    difficulty: "hard",
    instruction: "Determine the percentage of conference expenses paid for each person based on their sales performance and ratings.",
    question: "Work out what percentage of each person's conference expenses are paid.",
    prompt_rules: [
      "50% of conference expenses paid: Meets or exceeds sales goal by at least 5%; Average rating ≥ 3.5.",
      "75% of conference expenses paid: Meets or exceeds sales goal by at least 10%; Average rating ≥ 4.0.",
      "100% of conference expenses paid: Meets or exceeds sales goal by at least 15%; Average rating ≥ 4.0.",
      "If none of the above criteria are met, no conference expenses are paid."
    ],
    widget_data: {
      columns: [
        { key: "item", label: "Metric" },
        { key: "value", label: "" }
      ],
      approval_label: "Expenses Paid",
      tabs: [
        {
          id: "adam",
          label: "Adam",
          rows: [
            { item: "Sales Goal", value: "$60,000" },
            { item: "Sales", value: "$66,000" },
            { item: "Manager Rating", value: "4.0" },
            { item: "Peer Rating", value: "4.6" },
            { item: "Customer Rating", value: "3.9" }
          ]
        },
        {
          id: "barbara",
          label: "Barbara",
          rows: [
            { item: "Sales Goal", value: "$75,000" },
            { item: "Sales", value: "$87,000" },
            { item: "Manager Rating", value: "3.3" },
            { item: "Peer Rating", value: "4.4" },
            { item: "Customer Rating", value: "4.3" }
          ]
        },
        {
          id: "charles",
          label: "Charles",
          rows: [
            { item: "Sales Goal", value: "$70,000" },
            { item: "Sales", value: "$79,100" },
            { item: "Manager Rating", value: "3.9" },
            { item: "Peer Rating", value: "4.1" },
            { item: "Customer Rating", value: "3.7" }
          ]
        },
        {
          id: "diana",
          label: "Diana",
          rows: [
            { item: "Sales Goal", value: "$80,000" },
            { item: "Sales", value: "$82,000" },
            { item: "Manager Rating", value: "4.2" },
            { item: "Peer Rating", value: "3.8" },
            { item: "Customer Rating", value: "3.5" }
          ]
        }
      ],
      options: [
        { id: "none", label: "None" },
        { id: "50pct", label: "50%" },
        { id: "75pct", label: "75%" },
        { id: "100pct", label: "100%" }
      ]
    },
    correct_answer: {
      adam: "75pct",
      barbara: "100pct",
      charles: "50pct",
      diana: "none"
    },
    explanation: "Adam: exceeds by 10% ($66k/$60k), avg rating (4.0+4.6+3.9)/3=4.17≥4.0 → 75%. Barbara: exceeds by 16% ($87k/$75k), avg (3.3+4.4+4.3)/3=4.0≥4.0 → 100%. Charles: exceeds by 13% ($79.1k/$70k), avg (3.9+4.1+3.7)/3=3.9<4.0 → falls to 50% (≥5% & avg≥3.5). Diana: exceeds by 2.5% ($82k/$80k), <5% threshold → None."
  },

  // ── 8. Ranking: Sales Performance ──
  {
    id: "rank_sales_performance_real",
    subtype: "interactive_numerical",
    type: "interactive_ranking",
    difficulty: "hard",
    instruction: "Drag the badges to rank each person from 1 (highest) to 6 (lowest) by their sales-to-target ratio.",
    question: "Rank each person by their sales performance ratio (sold ÷ target).",
    prompt_rules: [
      "Ken: Sold $60, Target $75.",
      "Lindi: Sold $45, Target $30.",
      "Mike: Sold $50, Target $100.",
      "Naomi: Sold $80, Target $80.",
      "Oscar: Sold $60, Target $110.",
      "Patsy: Sold $75, Target $60."
    ],
    widget_data: {
      items: [
        { id: "ken", label: "Ken" },
        { id: "lindi", label: "Lindi" },
        { id: "mike", label: "Mike" },
        { id: "naomi", label: "Naomi" },
        { id: "oscar", label: "Oscar" },
        { id: "patsy", label: "Patsy" }
      ],
      rank_labels: ["1 (Highest)", "2", "3", "4", "5", "6 (Lowest)"]
    },
    correct_answer: {
      lindi: 1,
      patsy: 2,
      naomi: 3,
      ken: 4,
      oscar: 5,
      mike: 6
    },
    explanation: "Ratios: Ken=60/75=0.80, Lindi=45/30=1.50, Mike=50/100=0.50, Naomi=80/80=1.00, Oscar=60/110=0.545, Patsy=75/60=1.25. Highest→Lowest: Lindi(1), Patsy(2), Naomi(3), Ken(4), Oscar(5), Mike(6)."
  },

  // ── 9. Pie Chart: Share Portfolio ──
  {
    id: "pie_share_portfolio_real",
    subtype: "interactive_numerical",
    type: "interactive_pie_chart",
    difficulty: "hard",
    instruction: "Adjust the pie chart to represent the total value of your portfolio accounted for by each company.",
    question: "Resize each company's slice to match its share of total portfolio value.",
    prompt_rules: [
      "You hold 800 shares across 4 companies.",
      "Company A: 110 shares valued at 48¢ per share.",
      "Company B: 120 shares valued at 150¢ more per share than Company D.",
      "Company C: 370 shares valued at 100¢ per share.",
      "Company D: 200 shares valued at 50¢ per share."
    ],
    widget_data: {
      total_value: 800,
      info_cards: [
        { id: "a_info", title: "Company A", subtitle: "110 shares × 48¢", color: "blue" },
        { id: "b_info", title: "Company B", subtitle: "120 shares × (D + 150¢)", color: "green" },
        { id: "c_info", title: "Company C", subtitle: "370 shares × 100¢", color: "red" },
        { id: "d_info", title: "Company D", subtitle: "200 shares × 50¢", color: "orange" }
      ],
      segments: [
        { id: "comp_a", label: "Company A", color: "blue", initial_pct: 25 },
        { id: "comp_b", label: "Company B", color: "green", initial_pct: 25 },
        { id: "comp_c", label: "Company C", color: "red", initial_pct: 25 },
        { id: "comp_d", label: "Company D", color: "orange", initial_pct: 25 }
      ]
    },
    correct_answer: { comp_a: 7, comp_b: 31, comp_c: 49, comp_d: 13 },
    tolerance: { pct: 2 },
    explanation: "Values: A=110×48¢=$52.80, B=120×200¢=$240 (D=50¢, so B=50+150=200¢), C=370×100¢=$370, D=200×50¢=$100. Total=$762.80. A≈7%, B≈31%, C≈49%, D≈13%."
  },

  // ── 10. Pie Chart: College Enrollment ──
  {
    id: "pie_college_classes_real",
    subtype: "interactive_numerical",
    type: "interactive_pie_chart",
    difficulty: "hard",
    instruction: "Adjust the pie chart to represent the number of students in each class.",
    question: "Resize each class slice to match enrollment (round only in the last step).",
    prompt_rules: [
      "Total enrollment: 1,400 students across four classes.",
      "Class 1: Accounts for 23% of the total population.",
      "Class 2: Has 364 students.",
      "Class 3: No direct information available (use remaining students).",
      "Class 4: Has 20% fewer students than Class 2."
    ],
    widget_data: {
      total_value: 1400,
      info_cards: [
        { id: "c1_info", title: "Class 1", subtitle: "23% of total", color: "blue" },
        { id: "c2_info", title: "Class 2", subtitle: "364 students", color: "green" },
        { id: "c3_info", title: "Class 3", subtitle: "Remainder", color: "red" },
        { id: "c4_info", title: "Class 4", subtitle: "20% fewer than Class 2", color: "orange" }
      ],
      segments: [
        { id: "class_1", label: "Class 1", color: "blue", initial_pct: 25 },
        { id: "class_2", label: "Class 2", color: "green", initial_pct: 25 },
        { id: "class_3", label: "Class 3", color: "red", initial_pct: 25 },
        { id: "class_4", label: "Class 4", color: "orange", initial_pct: 25 }
      ]
    },
    correct_answer: { class_1: 23, class_2: 26, class_3: 30, class_4: 21 },
    tolerance: { pct: 2 },
    explanation: "Class 1=23%→322. Class 2=364→26%. Class 4=364×0.8=291.2≈291→20.8%≈21%. Class 3=1400-322-364-291=423→30.2%≈30%."
  },

  // ── 11. Pie Chart: Book Chapters ──
  {
    id: "pie_book_chapters_real",
    subtype: "interactive_numerical",
    type: "interactive_pie_chart",
    difficulty: "hard",
    instruction: "Adjust the pie chart to represent the number of pages in each chapter.",
    question: "Resize each chapter's slice to match its share of total pages.",
    prompt_rules: [
      "There are four chapters in a book.",
      "Chapter 1: 90 pages.",
      "Chapter 2: Twice as many pages as Chapter 4.",
      "Chapter 3: 50% more pages than Chapter 1.",
      "Chapter 4: 60 pages."
    ],
    widget_data: {
      total_value: 405,
      info_cards: [
        { id: "ch1_info", title: "Chapter 1", subtitle: "90 pages", color: "blue" },
        { id: "ch2_info", title: "Chapter 2", subtitle: "2× Chapter 4", color: "green" },
        { id: "ch3_info", title: "Chapter 3", subtitle: "50% more than Ch 1", color: "red" },
        { id: "ch4_info", title: "Chapter 4", subtitle: "60 pages", color: "orange" }
      ],
      segments: [
        { id: "ch_1", label: "Chapter 1", color: "blue", initial_pct: 25 },
        { id: "ch_2", label: "Chapter 2", color: "green", initial_pct: 25 },
        { id: "ch_3", label: "Chapter 3", color: "red", initial_pct: 25 },
        { id: "ch_4", label: "Chapter 4", color: "orange", initial_pct: 25 }
      ]
    },
    correct_answer: { ch_1: 22, ch_2: 30, ch_3: 33, ch_4: 15 },
    tolerance: { pct: 2 },
    explanation: "Ch1=90, Ch4=60, Ch2=2×60=120, Ch3=90×1.5=135. Total=405. Ch1=90/405≈22%, Ch2=120/405≈30%, Ch3=135/405≈33%, Ch4=60/405≈15%."
  },

  // ── 12. Pie Chart: Product Pipeline ──
  {
    id: "pie_product_pipeline_real",
    subtype: "interactive_numerical",
    type: "interactive_pie_chart",
    difficulty: "medium",
    instruction: "Adjust the pie chart to represent the proportion of products in each department.",
    question: "Resize each department's slice to match its share of products being processed.",
    prompt_rules: [
      "A company has four departments processing new products.",
      "Design: 5 products currently being processed.",
      "R&D: 3 products being developed.",
      "Production: 8 products in production.",
      "Delivery: 4 products being delivered."
    ],
    widget_data: {
      total_value: 20,
      info_cards: [
        { id: "design_info", title: "Design", subtitle: "5 products", color: "blue" },
        { id: "rnd_info", title: "R&D", subtitle: "3 products", color: "green" },
        { id: "prod_info", title: "Production", subtitle: "8 products", color: "red" },
        { id: "deliv_info", title: "Delivery", subtitle: "4 products", color: "orange" }
      ],
      segments: [
        { id: "design", label: "Design", color: "blue", initial_pct: 25 },
        { id: "rnd", label: "R&D", color: "green", initial_pct: 25 },
        { id: "production", label: "Production", color: "red", initial_pct: 25 },
        { id: "delivery", label: "Delivery", color: "orange", initial_pct: 25 }
      ]
    },
    correct_answer: { design: 25, rnd: 15, production: 40, delivery: 20 },
    tolerance: { pct: 2 },
    explanation: "Total=5+3+8+4=20. Design=5/20=25%, R&D=3/20=15%, Production=8/20=40%, Delivery=4/20=20%."
  }
]

// ── Run ──
const existing = JSON.parse(fs.readFileSync(goldStandardPath, 'utf8'))
const existingIds = new Set(existing.map(q => q.id))

const dupes = newQuestions.filter(q => existingIds.has(q.id))
if (dupes.length > 0) {
  console.error('⚠ Duplicate IDs found — aborting:', dupes.map(q => q.id).join(', '))
  process.exit(1)
}

existing.push(...newQuestions)
fs.writeFileSync(goldStandardPath, JSON.stringify(existing, null, 2) + '\n', 'utf8')

console.log(`✓ Added ${newQuestions.length} new questions (total now ${existing.length})`)
console.log('  IDs:', newQuestions.map(q => q.id).join(', '))
