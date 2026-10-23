export interface DerivationItem {
  title: string;
  latex: string;
  explanation: string;
}

export interface PracticeQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  solution: string;
  category?: "pyq" | "verification";
  examTag?: string;
  conceptTested?: string;
}

export interface YoutubeQueryItem {
  title: string;
  channelHint: string;
  searchQuery: string;
  durationFocus: string;
}

export interface BlueprintMicroConcept {
  id: string;
  title: string;
  focusPrompt: string;
}

export interface ExpandedMicroConceptChunk {
  index: number;
  id: string;
  title: string;
  deepExplanation: string;
  derivation: DerivationItem;
  keyPoints: string[];
}

export interface StudyNoteData {
  overview: string;
  derivations: DerivationItem[];
  keyPoints: string[];
  examTraps: string[];
  practiceQuestions: PracticeQuestion[];
  youtubeQueries: YoutubeQueryItem[];
  expandedChunks?: ExpandedMicroConceptChunk[];
  isGraphCanonical?: boolean;
  generatedAt?: string;
}

export interface SyllabusChapter {
  title: string;
  subtopics: string[];
}

export interface SyllabusUnit {
  unit: string;
  chapters: SyllabusChapter[];
}

export const SYLLABUS_TREE: SyllabusUnit[] = [
  {
    unit: "1. Micro Economics",
    chapters: [
      {
        title: "Consumer Theory or Behavior",
        subtopics: [
          "Demand: Law of Demand, Elasticities & Market Demand",
          "Utility: Cardinal vs. Ordinal Utility & MU Analysis",
          "Indifference Curve: Properties, MRS, Budget Line & Consumer Equilibrium",
          "Income, Substitution & Price Effects (Slutsky vs. Hicks)",
          "Revealed Preference Theory: Weak & Strong Axioms (WARP & SARP)",
          "Consumer Surplus: Marshallian vs. Hicksian Measures"
        ]
      },
      {
        title: "Production & Cost Theory",
        subtopics: [
          "Production Function: Cobb-Douglas, CES, Leontief & Isoquants",
          "Law of Variable Proportions & Three Stages of Production",
          "Returns to Scale & Producer Equilibrium (Expansion Path)",
          "Cost Function: Short-Run vs. Long-Run Costs, Envelope Curve & Economies of Scale"
        ]
      },
      {
        title: "Price and Output Determination in Market",
        subtopics: [
          "Perfect Competition: Short-Run & Long-Run Equilibrium",
          "Monopoly: Equilibrium, Lerner Index & Deadweight Loss",
          "Price Discrimination: First, Second & Third Degree + Peak-Load Pricing",
          "Monopolistic Competition: Chamberlin's Model & Excess Capacity",
          "Duopoly & Oligopoly Models: Cournot, Bertrand, Stackelberg & Kinked Demand"
        ]
      },
      {
        title: "General Equilibrium, Efficiency and Welfare",
        subtopics: [
          "Pure Exchange & Production Equilibrium (Edgeworth Box & Contract Curve)",
          "Overall Efficiency, Pareto Optimality & Fundamental Theorems of Welfare Economics",
          "Welfare Economics: Social Welfare Functions, Kaldor-Hicks Compensation & Arrow's Impossibility",
          "Externalities: Market Failure, Pigouvian Taxes & Coase Theorem"
        ]
      }
    ]
  },
  {
    unit: "2. Macro Economics",
    chapters: [
      {
        title: "National Income Accounting",
        subtopics: [
          "National Income Concepts: GDP, GNP, NNP, Personal & Disposable Income",
          "Measurement Methods (Product, Income, Expenditure), Deflators & Green GDP"
        ]
      },
      {
        title: "Income and Output Determination",
        subtopics: [
          "Aggregate Demand and Aggregate Supply Framework",
          "Effective Demand Principle & Keynesian Cross",
          "Classical vs. Keynesian Theory of Output and Employment"
        ]
      },
      {
        title: "Money, Inflation & Policy",
        subtopics: [
          "Demand and Supply of Money (Baumol-Tobin, Friedman, Keynes)",
          "Money Multiplier, High-Powered Money & Credit Creation by Commercial Banks",
          "Role of Reserve Bank of India (RBI) & Commercial Banks",
          "Quantitative Theories of Money (Fisher & Cambridge Versions)",
          "Philip's Curve: Short-Run vs. Long-Run, NAIRU & Adaptive/Rational Expectations",
          "Monetary and Fiscal Policy of India, IS-LM Interaction & Crowding Out"
        ]
      },
      {
        title: "Consumption and Investment Function",
        subtopics: [
          "Keynesian Absolute Income & Duesenberry Relative Income Hypothesis",
          "Friedman's Permanent Income & Modigliani's Life Cycle Hypothesis",
          "Determinants of Business Fixed, Residential & Inventory Investment (MEC, MEI, Tobin's q)",
          "Multiplier, Accelerator & Samuelson-Hicks Trade Cycle Interaction"
        ]
      },
      {
        title: "Open Economy Models",
        subtopics: [
          "Balance of Payments (BoP): Current, Capital Accounts & Disequilibrium",
          "Exchange Rate Determination (Fixed vs. Flexible) & Purchasing Power Parity (PPP)",
          "Mundell-Fleming Model (IS, LM and BP Curves) under Capital Mobility Regimes"
        ]
      },
      {
        title: "Economic Growth",
        subtopics: [
          "Harrod-Domar Model: Warranted, Natural & Actual Growth + Knife-Edge Instability",
          "Solow Model: Steady State, Golden Rule of Capital Accumulation & Technological Progress"
        ]
      }
    ]
  },
  {
    unit: "3. Statistical Methods in Economics",
    chapters: [
      {
        title: "Descriptive Statistics & Dispersion",
        subtopics: [
          "Measures of Central Tendency: Mean (AM, GM, HM), Mode & Median",
          "Dispersion: Range, Quartile Deviation, Average Deviation & Standard Deviation",
          "Moments, Skewness & Kurtosis"
        ]
      },
      {
        title: "Correlation & Regression",
        subtopics: [
          "Correlation: Karl Pearson's Coefficient & Spearman's Rank Correlation",
          "Simple Regression Model: OLS Estimation, Properties (BLUE) & R-Squared"
        ]
      },
      {
        title: "Probability & Sampling",
        subtopics: [
          "Probability Theory, Bayes' Theorem & Random Variables",
          "Probability Distributions: Binomial, Poisson & Normal Distributions",
          "Sampling Methods, Sampling Distributions (t, Chi-Square, F) & Hypothesis Testing"
        ]
      }
    ]
  },
  {
    unit: "4. Mathematical Methods in Economics",
    chapters: [
      {
        title: "Sets, Vectors & Linear Algebra",
        subtopics: [
          "Sets, Relations, Functions & Vector Spaces",
          "Determinants, Matrix Algebra, Rank, Inverse & Cramer's Rule",
          "Input-Output Analysis (Leontief Static Open/Closed Models) & Linear Programming (Duality, Simplex)"
        ]
      },
      {
        title: "Calculus & Optimization",
        subtopics: [
          "Functions of One and Several Real Variables, Continuity & Partial Derivatives",
          "Single and Multi-Variable Optimization (Unconstrained & Lagrange Multiplier)",
          "Convexity/Concavity, Homogeneous Functions & Euler's Theorem"
        ]
      },
      {
        title: "Integration & Dynamic Equations",
        subtopics: [
          "Integration of Functions & Economic Applications (Consumer/Producer Surplus, Capital Formation)",
          "First-Order Differential Equations & Phase Diagrams",
          "First-Order Difference Equations & Cobweb Model"
        ]
      }
    ]
  },
  {
    unit: "5. Indian Economy, Public Economics & Trade",
    chapters: [
      {
        title: "Colonial Economy: Macro Trends, Agriculture & Industry",
        subtopics: [
          "Macro Trends: National Income, Population & Occupational Structure in Colonial India",
          "Agriculture: Agrarian Structure, Land Relations, Credit, Markets, Productivity & Famines",
          "Railways & Industry: De-industrialization Debate, Interwar Industrialization & Labor Relations",
          "Imperial Priorities: Drain of Wealth, International Trade/Capital Flows & Colonial Fiscal Policy",
          "New Economic Policy (1991 LPG Reforms) & Post-Reform Sectoral Trends"
        ]
      },
      {
        title: "Public Economics & Taxation",
        subtopics: [
          "Public and Private Goods, Merit Goods, Free-Rider Problem & Externalities",
          "Budget, Deficits (Revenue, Fiscal, Primary), Public Debt & Fiscal Federalism in India (Finance Commissions, GST)",
          "Taxation: Economic Effects, Deadweight Loss & Distortion",
          "Efficiency and Equity Considerations, Tax Incidence & Optimal Taxation (Ramsey Rule)"
        ]
      },
      {
        title: "International Trade Theories",
        subtopics: [
          "Classical Trade Theories: Adam Smith (Absolute Advantage) & Ricardo (Comparative Advantage)",
          "Heckscher-Ohlin Model, Stolper-Samuelson & Rybczynski Theorems",
          "New Trade Theories: Krugman's Intra-Industry Trade, Economies of Scale & Imperfect Competition"
        ]
      }
    ]
  }
];

export const DEFAULT_SEED_NOTES: Record<string, StudyNoteData> = {
  "Demand: Law of Demand, Elasticities & Market Demand": {
    overview:
      "**Real-World Intuition (The Everyday Shopper Rule):** Think about buying mangoes in the summer. When the price drops from ₹200/kg to ₹80/kg, you naturally buy more. That simple everyday habit is the **Law of Demand**: when the price ($P$) of a good goes up, the quantity people want to buy ($Q_d$) goes down, assuming everything else in their life stays constant (*ceteris paribus*). To find the **Market Demand**, we just add up the shopping lists of every buyer at each price—known as **horizontal summation** ($Q_M = q_1 + q_2 + \\dots + q_n$).\n\n**Why Do We Need Elasticity?** Saying \"people buy less when price rises\" isn't enough for an exam—we need to know *how much* less. If salt becomes $10\\%$ costlier, you barely change your cooking, but if a movie ticket jumps $50\\%$, you stay home. **Elasticity** measures this exact sensitivity as a pure percentage ratio, so it doesn't matter whether prices are measured in Rupees or Dollars.\n\n**The No-Money-Illusion Rule:** Imagine your salary doubles overnight, and at the exact same moment the price of every single item in the economy also doubles. Are you any richer or poorer? Neither! Your real purchasing power hasn't changed at all, so you buy the exact same basket of goods. In economics, this is called **homogeneity of degree zero** in prices and income ($Y$).",
    derivations: [
      {
        title: "1. Own-Price, Income & Cross-Price Elasticity (Translating Sensitivity)",
        latex: "e_p = \\frac{\\Delta Q}{\\Delta P} \\cdot \\frac{P}{Q}, \\quad e_Y = \\frac{\\Delta Q}{\\Delta Y} \\cdot \\frac{Y}{Q}, \\quad e_{xy} = \\frac{\\Delta Q_x}{\\Delta P_y} \\cdot \\frac{P_y}{Q_x}",
        explanation:
          "**Plain-English Translation:** Don't let the fractions intimidate you—every elasticity formula is just $\\frac{\\%\\text{ Change in Quantity}}{\\%\\text{ Change in Trigger}}$. Here, $e_p$ (own-price elasticity) tells you by what percentage your quantity demanded ($Q$) changes when the good's own price ($P$) changes by $1\\%$. Similarly, $e_Y$ (income elasticity) measures how your buying responds to a $1\\%$ rise in your income ($Y$), and $e_{xy}$ (cross-price elasticity) measures how your buying of Good $X$ reacts when the price of another Good $Y$ ($P_y$) changes. On a straight-line demand curve, point elasticity at any spot is simply $\\frac{\\text{Lower Segment}}{\\text{Upper Segment}}$, which equals $1$ at the exact midpoint!"
      },
      {
        title: "2. The Amoroso-Robinson Formula (How Elasticity Controls Revenue)",
        latex: "MR = P\\left(1 - \\frac{1}{|e_p|}\\right)",
        explanation:
          "**Plain-English Translation:** Here, $MR$ (Marginal Revenue—the extra money a seller earns from selling one more unit) is linked directly to $P$ (the selling price) and $|e_p|$ (how price-sensitive buyers are, ignoring the minus sign). Think of a shopkeeper deciding whether to cut prices: if buyers are super sensitive ($|e_p| > 1$, called **elastic**), cutting the price brings in a huge rush of new customers, so Total Revenue rises ($MR > 0$). At the midpoint where $|e_p| = 1$, $MR = 0$ and Total Revenue hits its absolute peak!"
      },
      {
        title: "3. Engel & Cournot Aggregation (The Budget Pie Rules)",
        latex: "\\sum_{i=1}^{n} s_i e_{iY} = 1, \\qquad \\sum_{j=1}^{n} e_{ij} + e_{iY} = 0",
        explanation:
          "**Plain-English Translation:** Here, $s_i = \\frac{P_i Q_i}{Y}$ is simply the **budget share**—the fraction of your total wallet ($Y$) spent on item $i$ (for example, $s_{\\text{rent}} = 0.40$ means $40\\%$ of your income goes to rent). The first equation (**Engel Aggregation**) says that if you weight each good's income elasticity ($e_{iY}$) by its share of your wallet ($s_i$), they must add up to exactly $1$. Why? Because $100\\%$ of any extra rupee you earn must be spent somewhere! The second equation (**Euler's Homogeneity Rule**) says that for any single good, all its price elasticities plus its income elasticity add up to $0$ (because doubling all prices and income leaves demand unchanged)."
      }
    ],
    keyPoints: [
      "**Constant Elasticity Curve (The Fixed-Budget Rule):** When a demand curve has the equation $Q = k P^{-\\varepsilon}$, its price elasticity is frozen at $-\\varepsilon$ everywhere on the curve. Special exam case: if $\\varepsilon = 1$ (rectangular hyperbola), you spend the exact same total Rupee amount ($P \\times Q = k$) no matter how high or low the price goes!",
      "**Giffen Goods (The Poverty Bread Paradox):** Imagine a poor household that survives mostly on cheap bread and occasional meat. If the price of bread rises, they become so much poorer in real terms that they have to cancel meat completely and buy *even more* bread to fill their stomachs. Here, price ($P$) goes up and quantity ($Q$) also goes up! **Memory Rule:** Every Giffen good is an inferior good ($e_Y < 0$), but not every inferior good is a Giffen good.",
      "**Bandwagon vs. Snob Effect (TrendFollowers vs. VIPs):** Under the **Bandwagon Effect**, people buy a phone because everyone else is buying it—this makes the market demand curve **flatter** (more elastic). Under the **Snob Effect**, rich buyers want exclusivity and stop buying if a product becomes too common—this makes the market demand curve **steeper** (less elastic).",
      "**Substitutes vs. Complements ($e_{xy}$ Sign Check):** Think of Tea and Coffee (**Substitutes**): if Coffee gets expensive ($P_y \\uparrow$), people switch to Tea ($Q_x \\uparrow$), so $e_{xy} > 0$. Think of Cars and Petrol (**Complements**): if Petrol gets expensive ($P_y \\uparrow$), people buy fewer Cars ($Q_x \\downarrow$), so $e_{xy} < 0$.",
      "**Necessities vs. Luxuries ($e_Y$ Range Check):** **Inferior goods** have $e_Y < 0$ (you ditch instant noodles when you get rich). **Necessities** have $0 < e_Y < 1$ (you buy slightly more food when rich, but food takes up a smaller slice of your paycheck—**Engel's Law**). **Luxuries** have $e_Y > 1$ (foreign vacations grow faster than your paycheck).",
      "**Midpoint Arc Elasticity (Fair Average Rule):** When price jumps between two points $(P_1, Q_1)$ and $(P_2, Q_2)$, use the average price and average quantity as your base so your answer doesn't change whether price goes up or down: $e_{\\text{arc}} = \\frac{\\Delta Q}{\\Delta P} \\cdot \\frac{P_1 + P_2}{Q_1 + Q_2}$."
    ],
    examTraps: [
      "**The Trap:** Students often confuse the **slope** of a straight-line demand curve with its **elasticity**, assuming a straight line has constant elasticity.\n**The Reality:** A straight-line demand curve ($Q = a - bP$) has a **constant slope** ($-b$), but its **elasticity changes at every single point**! At the top intercept where $Q = 0$, elasticity is $\\infty$; at the exact middle, $|e_p| = 1$; and at the bottom intercept where $P = 0$, elasticity is $0$.",
      "**The Trap:** Students often think that every good in a consumer's basket can be an inferior good (or every good can be a luxury good) at the same time.\n**The Reality:** Because of the budget pie rule ($\\sum s_i e_{iY} = 1$), the weighted average of all income elasticities MUST equal $1$. If one good has $e_Y < 1$ (inferior or necessity), at least one other good in the basket *must* have $e_Y > 1$ (luxury) to balance the average back to $1$!",
      "**The Trap:** Students often confuse **Horizontal Summation** (used for private goods like apples) with **Vertical Summation** (used for public goods like street lighting).\n**The Reality:** Here is the simple difference: for **Private Goods**, everyone pays the same market price $P$ and buys their own quantity, so we add quantities horizontally ($Q_M = q_1 + q_2$). For **Public Goods**, everyone consumes the exact same quantity $Q$ (the same streetlight), so we add each person's willingness to pay vertically ($P_M = P_1 + P_2$)."
    ],
    practiceQuestions: [
      {
        category: "pyq",
        examTag: "CUET PG 2025 (COQP10) · PYQ",
        conceptTested: "Cross-Price Elasticity ($e_{xy}$) & Substitutes vs. Complements",
        question: "When the price of Coffee ($P_y$) rises from $\\text{Rs. } 100$ to $\\text{Rs. } 120$, the quantity demanded of Tea ($Q_x$) increases from $200$ units to $260$ units. What is the point cross-price elasticity of demand ($e_{xy}$), and how are the two goods related?",
        options: [
          "$e_{xy} = +1.50$ (Gross Substitutes)",
          "$e_{xy} = -1.50$ (Gross Complements)",
          "$e_{xy} = +0.67$ (Gross Substitutes)",
          "$e_{xy} = +1.25$ (Independent Goods)"
        ],
        correctIndex: 0,
        solution: "**Intuitive PYQ Walkthrough:** First check the direction: Coffee got more expensive ($P_y \\uparrow$ by $20\\%$) and people switched to buying more Tea ($Q_x \\uparrow$ by $30\\%$), so they are **Substitutes** ($e_{xy} > 0$). Using the formula $e_{xy} = \\frac{\\Delta Q_x}{\\Delta P_y} \\cdot \\frac{P_y}{Q_x} = \\frac{60}{20} \\cdot \\frac{100}{200} = 3 \\times 0.5 = +1.50$."
      },
      {
        category: "pyq",
        examTag: "CUET PG 2025 (COQP10) · PYQ",
        conceptTested: "Constant Elasticity (Isoelastic) Log-Linear Demand Curve",
        question: "Suppose the market demand function for a commodity is estimated in log-linear form as $\\ln Q_x = 4.5 - 1.8 \\ln P_x + 0.9 \\ln Y$. What are the own-price elasticity ($e_p$) and income elasticity ($e_Y$) of demand?",
        options: [
          "$e_p = -1.8$ (Elastic) and $e_Y = +0.9$ (Normal Necessity)",
          "$e_p = -4.5$ (Elastic) and $e_Y = +1.8$ (Luxury Good)",
          "$e_p = -1.8$ (Inelastic) and $e_Y = +0.9$ (Inferior Good)",
          "$e_p = -0.9$ (Inelastic) and $e_Y = +1.8$ (Luxury Good)"
        ],
        correctIndex: 0,
        solution: "**Exam Shortcut:** Whenever CUET PG gives a demand equation in **double-log ($\\ln Q$ vs. $\\ln P$, $\\ln Y$) form** (or power form $Q = A P^{-1.8} Y^{0.9}$), the **coefficients (exponents) ARE the elasticities directly**! Thus $e_p = \\frac{\\partial \\ln Q_x}{\\partial \\ln P_x} = -1.8$ (price elastic since $|e_p| > 1$) and $e_Y = \\frac{\\partial \\ln Q_x}{\\partial \\ln Y} = +0.9$ (a normal necessity since $0 < e_Y < 1$)."
      },
      {
        category: "pyq",
        examTag: "CUET PG 2024 (COQP10) · PYQ",
        conceptTested: "Rectangular Hyperbola & Constant Unitary Elasticity",
        question: "If a consumer's demand curve for a commodity is a rectangular hyperbola given by $Q_d = \\frac{k}{P}$ (where $k > 0$ is a constant), what is the own-price elasticity of demand $|e_p|$ at every point on this curve?",
        options: ["$|e_p| = 1$ (Unitary Elastic everywhere)", "$|e_p| = 0$ (Perfectly Inelastic)", "$|e_p| = \\infty$ (Perfectly Elastic)", "$|e_p| = k$ (Depends on constant $k$)"],
        correctIndex: 0,
        solution: "**Intuitive PYQ Walkthrough:** Rewrite $Q_d = \\frac{k}{P}$ as $P \\cdot Q_d = k$. Notice what this means in plain English: **Total Expenditure ($P \\times Q_d$) is frozen at a constant $k$** no matter how much price changes! Whenever total spending stays completely unchanged after a price change, the percentage drop in quantity exactly cancels out the percentage rise in price, so $|e_p| = 1$ at every single point."
      },
      {
        category: "pyq",
        examTag: "CUET PG 2024 (COQP10) · PYQ",
        conceptTested: "Total Outlay / Total Expenditure ($TE = P \\cdot Q$) Method",
        question: "According to Marshall's Total Outlay Method, if a fall in the price of a commodity ($P \\downarrow$) causes the consumer's Total Expenditure ($TE = P \\times Q$) on that commodity to decrease ($TE \\downarrow$), then the price elasticity of demand $|e_p|$ is:",
        options: [
          "Less than unity ($|e_p| < 1$, Inelastic Demand)",
          "Greater than unity ($|e_p| > 1$, Elastic Demand)",
          "Equal to unity ($|e_p| = 1$, Unitary Elastic)",
          "Infinite ($|e_p| = \\infty$, Perfectly Elastic)"
        ],
        correctIndex: 0,
        solution: "**Plain-English Memory Rule:** Using $\\frac{d(TE)}{dP} = Q(1 - |e_p|)$, when demand is **Inelastic ($|e_p| < 1$)**, buyers barely increase their quantity when price drops. So Price ($P$) and Total Expenditure ($TE$) move in the **same direction** ($P \\downarrow \\implies TE \\downarrow$, and $P \\uparrow \\implies TE \\uparrow$). When demand is **Elastic ($|e_p| > 1$)**, $P$ and $TE$ move in **opposite directions**."
      },
      {
        category: "pyq",
        examTag: "CUET PG 2023 (COQP10) · PYQ",
        conceptTested: "Linear Demand Midpoint & Total Revenue Peak",
        question: "If a consumer's Marshallian demand function for good $X$ is given by $Q_x = 120 - 4P_x$, at what price $P_x$ is the own-price elasticity of demand unitary ($|e_p| = 1$)?",
        options: ["$P_x = 15$", "$P_x = 30$", "$P_x = 60$", "$P_x = 20$"],
        correctIndex: 0,
        solution: "**Intuitive Shortcut:** On any straight-line demand curve, unitary elasticity ($|e_p| = 1$) always happens at the **exact midpoint**! First find the maximum choke price where quantity hits zero ($Q_x = 0$): $120 - 4P_x = 0 \\implies P_{\\max} = 30$. Half of $30$ is $P_x = 15$ (where $Q_x = 60$ and Total Revenue is maximized)."
      },
      {
        category: "pyq",
        examTag: "CUET PG 2023 (COQP10) · PYQ",
        conceptTested: "Amoroso-Robinson Formula (MR & Price Elasticity)",
        question: "Suppose the absolute price elasticity of demand facing a profit-maximizing monopolist is $|e_p| = 2.5$ and Marginal Cost is constant at $MC = 60$. What is the optimal price $P^*$?",
        options: ["$P^* = 100$", "$P^* = 90$", "$P^* = 150$", "$P^* = 80$"],
        correctIndex: 0,
        solution: "**Step-by-Step Translation:** A profit-maximizing seller sets $MR = MC$ (extra revenue from the last unit equals extra cost of making it). Using the Amoroso-Robinson formula $MR = P^*\\left(1 - \\frac{1}{|e_p|}\\right) = MC$: plug in $|e_p| = 2.5$ and $MC = 60$ to get $P^*\\left(1 - \\frac{1}{2.5}\\right) = 60 \\implies P^*(0.6) = 60 \\implies P^* = 100$."
      },
      {
        category: "pyq",
        examTag: "CUET PG 2022 (COQP10) · PYQ",
        conceptTested: "Giffen Good vs. Inferior Good Classification",
        question: "Which of the following statements accurately describes the relationship between Giffen goods and Inferior goods in consumer demand theory?",
        options: [
          "All Giffen goods are inferior goods, but not all inferior goods are Giffen goods",
          "All inferior goods are Giffen goods, but not all Giffen goods are inferior goods",
          "Giffen goods have a positive substitution effect that outweighs the income effect",
          "Giffen goods have a positive income elasticity of demand ($e_Y > 0$)"
        ],
        correctIndex: 0,
        solution: "**Plain-English Reality:** An **inferior good** simply means you buy less of it when your income rises ($e_Y < 0$). However, most inferior goods still obey the Law of Demand because the substitution effect is stronger than the income effect. Only in the extreme poverty case where the negative income effect is so massive that it overpowers the substitution effect does an inferior good become a **Giffen good** ($\\frac{\\partial Q}{\\partial P} > 0$). Hence, every Giffen good is inferior, but not every inferior good is Giffen!"
      },
      {
        category: "pyq",
        examTag: "CUET PG 2022 (COQP10) · PYQ",
        conceptTested: "Horizontal Summation & Market Demand Kink Point",
        question: "In a two-consumer market for a private good, Consumer 1's demand is $q_1 = 20 - P$ (for $P \\le 20$) and Consumer 2's demand is $q_2 = 10 - P$ (for $P \\le 10$). At what price $P$ does the aggregate market demand curve $Q_M(P)$ exhibit a kink?",
        options: [
          "$P = 10$ (where Consumer 2 enters the market)",
          "$P = 20$ (where Consumer 1 enters the market)",
          "$P = 15$ (the average of the two choke prices)",
          "$P = 30$ (the sum of the two choke prices)"
        ],
        correctIndex: 0,
        solution: "**Visualizing the Kink:** When price is between $10 < P \\le 20$, Consumer 2 is priced out ($q_2 = 0$), so only Consumer 1 buys ($Q_M = 20 - P$). The exact moment price drops below $P = 10$, Consumer 2 jumps into the market and starts buying too, so the formula switches to $Q_M = (20 - P) + (10 - P) = 30 - 2P$. That sudden flattening of the market demand curve happens right at the **kink price $P = 10$**!"
      },
      {
        category: "pyq",
        examTag: "CUET PG 2021 (CUCET) · PYQ",
        conceptTested: "Midpoint Arc Elasticity Formula ($e_{\\text{arc}}$)",
        question: "When the price of a good falls from $P_1 = 12$ to $P_2 = 8$, the quantity demanded rises from $Q_1 = 40$ to $Q_2 = 60$. Using the Midpoint Arc Elasticity formula, what is the absolute arc price elasticity of demand $|e_{\\text{arc}}|$?",
        options: [
          "$|e_{\\text{arc}}| = 1.0$",
          "$|e_{\\text{arc}}| = 1.5$",
          "$|e_{\\text{arc}}| = 0.67$",
          "$|e_{\\text{arc}}| = 1.25$"
        ],
        correctIndex: 0,
        solution: "**Fair-Average Rule:** Arc elasticity uses the average price $\\bar{P} = \\frac{12+8}{2} = 10$ and average quantity $\\bar{Q} = \\frac{40+60}{2} = 50$ as the base: $|e_{\\text{arc}}| = \\left|\\frac{\\Delta Q}{\\Delta P}\\right| \\cdot \\frac{P_1 + P_2}{Q_1 + Q_2} = \\frac{20}{4} \\cdot \\frac{20}{100} = 5 \\times 0.2 = 1.0$."
      },
      {
        category: "pyq",
        examTag: "CUET PG 2021 (CUCET) · PYQ",
        conceptTested: "Bandwagon, Snob & Veblen Network Externalities",
        question: "According to Harvey Leibenstein's theory of non-additivity in market demand, how do the Bandwagon Effect and the Snob Effect compare in terms of market price elasticity?",
        options: [
          "The Bandwagon Effect makes market demand more elastic (flatter), whereas the Snob Effect makes it less elastic (steeper)",
          "The Bandwagon Effect makes market demand less elastic (steeper), whereas the Snob Effect makes it more elastic (flatter)",
          "Both Bandwagon and Snob Effects make the market demand curve upward sloping like a Veblen good",
          "Neither effect alters the slope or elasticity of the aggregate market demand curve"
        ],
        correctIndex: 0,
        solution: "**Intuitive Comparison:** Under the **Bandwagon Effect** (trend-following), a price cut makes more people buy, which convinces *even more* trend-followers to join in—amplifying the quantity expansion and making the market demand curve **flatter (more price elastic)**. Under the **Snob Effect** (exclusivity-seeking), when a price cut makes the good common, snobs drop out, dampening the quantity increase and making the market demand curve **steeper (less price elastic)**."
      },
      {
        category: "verification",
        examTag: "Concept Check #1 · Topic Verification",
        conceptTested: "Engel Aggregation (The Budget Pie Rule)",
        question: "A consumer allocates $40\\%$ of nominal income to Good $X$ with income elasticity $e_{xY} = 0.5$, and the remaining $60\\%$ to Good $Y$. By Engel Aggregation, what must be the income elasticity of Good $Y$ ($e_{yY}$)?",
        options: ["$e_{yY} = 1.33$", "$e_{yY} = 1.50$", "$e_{yY} = 0.75$", "$e_{yY} = 1.20$"],
        correctIndex: 0,
        solution: "**Budget Pie Rule Verification:** By Engel Aggregation, the wallet-share-weighted average of income elasticities must equal $1$: $s_x e_{xY} + s_y e_{yY} = 1$. Plugging in $s_x = 0.40$ ($40\\%$ of wallet), $e_{xY} = 0.5$, and $s_y = 0.60$ ($60\\%$ of wallet): $0.4(0.5) + 0.6 e_{yY} = 1 \\implies 0.2 + 0.6 e_{yY} = 1 \\implies 0.6 e_{yY} = 0.8 \\implies e_{yY} = \\frac{4}{3} \\approx 1.33$."
      },
      {
        category: "verification",
        examTag: "Concept Check #2 · Topic Verification",
        conceptTested: "Euler's Homogeneity & Cross-Price Elasticity",
        question: "For a consumer whose demand for Good $X$ satisfies zero-degree homogeneity (no money illusion), the own-price elasticity is $e_{xx} = -1.2$ and cross-price elasticity with Good $Y$ is $e_{xy} = +0.4$. What is the income elasticity $e_{xY}$ and how are $X$ and $Y$ related?",
        options: [
          "$e_{xY} = +0.8$, and $X$ and $Y$ are gross substitutes",
          "$e_{xY} = -0.8$, and $X$ and $Y$ are gross complements",
          "$e_{xY} = +1.6$, and $X$ and $Y$ are gross substitutes",
          "$e_{xY} = +0.8$, and $X$ and $Y$ are gross complements"
        ],
        correctIndex: 0,
        solution: "**Concept Mastery Check:** First, since $e_{xy} = +0.4 > 0$, a rise in the price of $Y$ causes the consumer to buy *more* of $X$—just like Tea and Coffee, so they are **gross substitutes**. Second, by Euler's Homogeneity Rule ($e_{xx} + e_{xy} + e_{xY} = 0$), the elasticities must add up to zero: $-1.2 + 0.4 + e_{xY} = 0 \\implies e_{xY} = +0.8$ (a normal necessity)."
      },
      {
        category: "verification",
        examTag: "Concept Check #3 · Topic Verification",
        conceptTested: "Market Demand Horizontal Summation & Bandwagon Effect",
        question: "Two consumers have individual inverse demand curves $P = 20 - q_1$ and $P = 20 - 2q_2$ for a private good. For prices $P \\le 20$, what is the aggregate market demand function $Q_M(P)$, and how would a Bandwagon Effect alter this market curve?",
        options: [
          "$Q_M = 30 - 1.5P$; the Bandwagon Effect makes the market demand curve flatter (more elastic)",
          "$Q_M = 40 - 3P$; the Bandwagon Effect makes the market demand curve steeper (less elastic)",
          "$Q_M = 30 - 1.5P$; the Bandwagon Effect makes the market demand curve steeper (less elastic)",
          "$P = 40 - 3Q_M$; the Bandwagon Effect shifts the curve vertically"
        ],
        correctIndex: 0,
        solution: "**Concept Mastery Check:** For a **private good**, we always add quantities horizontally ($Q_M = q_1 + q_2$) at a given price $P$. Rewrite each demand curve in terms of quantity first: $q_1 = 20 - P$ and $q_2 = 10 - 0.5P$. Adding them gives $Q_M = (20 - P) + (10 - 0.5P) = 30 - 1.5P$. Furthermore, under the **Bandwagon Effect** (trend-following), a price cut triggers an extra wave of social buying, making the market demand curve **flatter (more elastic)**."
      }
    ],
    youtubeQueries: [
      {
        title: "Marshallian Demand, Elasticity Derivations & Amoroso-Robinson Relation",
        channelHint: "Graduate Microeconomics Lectures",
        searchQuery: "Marshallian demand price elasticity Amoroso Robinson microeconomics derivation",
        durationFocus: "45 min lecture"
      },
      {
        title: "Slutsky, Cournot & Engel Aggregation Proofs in Consumer Theory",
        channelHint: "Intermediate Microeconomics — Hal Varian Series",
        searchQuery: "Engel aggregation Cournot aggregation microeconomics Hal Varian proof",
        durationFocus: "30 min derivation"
      },
      {
        title: "Giffen Paradox, Bandwagon & Snob Effects Graphical Comparative Statics",
        channelHint: "Microeconomic Theory Prep",
        searchQuery: "Bandwagon effect Snob effect Giffen good microeconomics graphical analysis",
        durationFocus: "25 min concept review"
      }
    ]
  }
};
