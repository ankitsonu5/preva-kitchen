const LOCATION = 'Preva Kitchen & Lounge, 13090 Inkster Rd, Redford Township, MI 48239';
const HOURS = 'Monday through Friday from 11:00 AM to 3:30 PM';

/* Item-specific facts derived from the live Preva Kitchen menu. */
export const DISH_DETAIL_PROFILES = {
  'preva-wings': {
    title: 'Seven House Sauces, Made in Redford, MI',
    preparation: 'Jumbo wings are fried until crisp, then tossed to order in honey hot, buffalo, BBQ, sweet chili, garlic parmesan, lemon pepper or jerk.',
    occasion: 'Choose one sauce for your own plate or mix flavors across multiple orders when feeding a group.',
    question: 'Which sauces can I choose for the Preva Wings?',
    answer: 'Choose honey hot, buffalo, BBQ, sweet chili, garlic parmesan, lemon pepper or jerk. Honey hot brings sweet heat, while lemon pepper and garlic parmesan are the less saucy choices.',
    pairings: ['Fries', 'Mac & Cheese', 'House Salad']
  },
  'preva-wings-chilli': {
    title: 'Bright Sweet Chili Wings with a Mild Finish',
    preparation: 'Crispy wings are coated in a glossy sweet chili sauce that balances sweetness with a gentle warmth rather than heavy heat.',
    occasion: 'This is the approachable wing choice for guests who want more flavor than plain wings without the kick of buffalo or jerk.',
    question: 'Are the Preva Wings Chilli very spicy?',
    answer: 'No. The sweet chili glaze has a mild, bright finish. It is noticeably gentler than buffalo, honey hot or jerk.',
    pairings: ['Fries', 'Rice & Peas', 'Fried Plantains']
  },
  'honey-hot': {
    title: 'Sticky Sweet Heat on Crispy Jumbo Wings',
    preparation: 'The wings are fried crisp and tossed in hot honey, creating a sticky glaze with sweetness up front and heat on the finish.',
    occasion: 'Honey Hot is a strong pick when the table wants a crowd-friendly sauce that lands between sweet chili and buffalo.',
    question: 'How spicy are the Honey Hot Wings?',
    answer: 'Honey Hot has a medium sweet heat. The honey softens the spice, but the warm finish is still more noticeable than the sweet chili glaze.',
    pairings: ['Mac & Cheese', 'Fries', 'Collard Greens with Turkey Meat']
  },
  buffalo: {
    title: 'Tangy Cayenne Wings Served with Ranch',
    preparation: 'Crispy wings are tossed in a classic cayenne-forward buffalo sauce and served with ranch to cool and balance the tangy heat.',
    occasion: 'Order Buffalo when you want the familiar hot-wing profile for lunch, sharing or game-day delivery.',
    question: 'What comes with the Buffalo Wings?',
    answer: 'The wings are coated in tangy cayenne buffalo sauce and served with ranch. Add fries or a salad separately to complete the meal.',
    pairings: ['Fries', 'House Salad', 'Mac & Cheese']
  },
  bbq: {
    title: 'Smoky, Slow-Glazed Barbecue Wings',
    preparation: 'The wings are coated in smoky barbecue sauce, slow-glazed and finished on the grill for a deeper savory-sweet finish.',
    occasion: 'BBQ is the non-spicy, full-flavored wing option for family orders and mixed groups.',
    question: 'Are the BBQ Wings spicy?',
    answer: 'The BBQ Wings focus on smoky, savory-sweet flavor rather than chile heat, making them one of the milder wing choices.',
    pairings: ['Mac & Cheese', 'Collard Greens with Turkey Meat', 'Fries']
  },
  'garlic-parmesan': {
    title: 'Garlic Butter Wings Finished with Parmesan',
    preparation: 'Hot wings are tossed in savory garlic butter and finished with shaved parmesan for a rich, cheese-forward coating.',
    occasion: 'Garlic Parmesan is a good alternative to sweet or spicy sauces and works especially well in a mixed wing order.',
    question: 'Do the Garlic Parmesan Wings contain dairy?',
    answer: 'Yes. Garlic butter and parmesan both contain dairy, and the wings also contain gluten. Tell the kitchen about any allergy before ordering.',
    pairings: ['Fries', 'House Salad', 'Steamed Cabbage']
  },
  'lemon-pepper': {
    title: 'Crisp Wings with Lemon Zest and Black Pepper',
    preparation: 'The wings are fried crisp and seasoned with fresh lemon zest and cracked black pepper for a dry, bright finish.',
    occasion: 'Choose Lemon Pepper when you want a crisp wing without a sticky or creamy sauce.',
    question: 'Are the Lemon Pepper Wings saucy?',
    answer: 'No. Lemon Pepper is a dry-seasoned option built around cracked pepper and fresh lemon zest rather than a wet sauce.',
    pairings: ['Fries', 'Fried Plantains', 'House Salad']
  },
  jerk: {
    title: 'Caribbean-Spiced Wings Grilled Hot',
    preparation: 'The wings are marinated in Preva house jerk spice and grilled hot for a savory Caribbean profile with aromatic heat.',
    occasion: 'Jerk is the boldest wing choice for guests who enjoy layered spice rather than a simple hot-sauce burn.',
    question: 'What flavor should I expect from the Jerk Wings?',
    answer: 'Expect a savory Caribbean jerk profile with warm spice and a grilled finish. It is a bolder choice than BBQ or lemon pepper.',
    pairings: ['Rice & Peas', 'Fried Plantains', 'Steamed Cabbage']
  },
  'preva-burger': {
    title: 'The Signature Preva Cheeseburger',
    preparation: 'The burger is layered with American cheese, lettuce, tomato, red onion and pickles on a toasted bun.',
    occasion: 'It is a straightforward signature burger for a weekday lunch or a familiar main in a larger delivery order.',
    question: 'What toppings come on the Preva Burger?',
    answer: 'The Preva Burger comes with American cheese, lettuce, tomato, red onion and pickles on a toasted bun.',
    pairings: ['Fries', 'Mac & Cheese', 'Preva Wings']
  },
  'preva-double-smash-burger': {
    title: 'Two Smash Patties with Crisp Edges',
    preparation: 'Two patties are smashed on the hot cooking surface, layered with two slices of American cheese and thousand island, then served with fries.',
    occasion: 'The Double Smash is the fuller burger plate when you want the side already included.',
    question: 'Does the Preva Double Smash Burger come with fries?',
    answer: 'Yes. The Double Smash includes fries and comes with two patties, two slices of American cheese and thousand island.',
    pairings: ['House Salad', 'Preva Wings', 'Steamed Cabbage']
  },
  'preva-quesadillas': {
    title: 'Chicken or Beef Quesadillas Grilled to Order',
    preparation: 'A flour tortilla is filled with melted cheese, house seasoning and your choice of chicken or beef, then grilled and served with sour cream and salsa.',
    occasion: 'Choose Preva Quesadillas when the table wants one flexible dish with a choice of protein.',
    question: 'Which protein can I choose for the Preva Quesadillas?',
    answer: 'Choose seasoned chicken or beef. Both versions include melted cheese and are served with sour cream and salsa.',
    pairings: ['House Salad', 'Preva Wings', 'Rice & Peas']
  },
  'chicken-quesadillas': {
    title: 'Seasoned Chicken and Melted Cheese',
    preparation: 'Seasoned chicken and melted cheese are grilled inside a flour tortilla and served with sour cream and salsa.',
    occasion: 'The chicken version is a balanced, familiar choice for lunch and an easy dish to slice and share.',
    question: 'What comes with the Chicken Quesadillas?',
    answer: 'The grilled chicken-and-cheese quesadilla is served with sour cream and salsa on the side.',
    pairings: ['Fries', 'Rice & Peas', 'House Salad']
  },
  'steak-quesadilla': {
    title: 'Grilled Steak, Peppers and Onions',
    preparation: 'Grilled steak, melted cheese, peppers and onions are folded into a flour tortilla and served with sour cream and salsa.',
    occasion: 'The steak filling makes this the richest and most savory quesadilla on the menu.',
    question: 'What is inside the Steak Quesadilla?',
    answer: 'It includes grilled steak, melted cheese, peppers and onions in a flour tortilla, with sour cream and salsa on the side.',
    pairings: ['House Salad', 'Fries', 'Steamed Cabbage']
  },
  'shrimp-quesadillas': {
    title: 'Seasoned Shrimp with Peppers and Onions',
    preparation: 'Seasoned shrimp, melted cheese, peppers and onions are grilled in a flour tortilla and served with sour cream and salsa.',
    occasion: 'This seafood quesadilla brings a lighter protein to the same crisp tortilla and melted-cheese format.',
    question: 'Do the Shrimp Quesadillas contain shellfish?',
    answer: 'Yes. Shrimp is shellfish, and the dish also contains dairy and gluten. Tell the kitchen about any allergy before ordering.',
    pairings: ['House Salad', 'Fried Plantains', 'Rice & Peas']
  },
  'beef-quesadillas': {
    title: 'Seasoned Beef in a Crisp Grilled Tortilla',
    preparation: 'Seasoned beef and melted cheese are grilled in a flour tortilla and served with sour cream and salsa.',
    occasion: 'The beef version is a hearty, no-frills quesadilla for lunch, pickup or sharing.',
    question: 'What comes with the Beef Quesadillas?',
    answer: 'The seasoned beef-and-cheese quesadilla is served with sour cream and salsa on the side.',
    pairings: ['Fries', 'Preva Wings', 'House Salad']
  },
  'veggie-quesadilla': {
    title: 'Grilled Peppers, Onions and Melted Cheese',
    preparation: 'Peppers, onions and melted cheese are grilled in a flour tortilla and served with sour cream and salsa.',
    occasion: 'It is the meat-free quesadilla option and pairs naturally with another vegetable side or salad.',
    question: 'Is the Veggie Quesadilla vegetarian?',
    answer: 'Yes. Its filling is grilled peppers, onions and melted cheese. It contains dairy and gluten and is served with sour cream and salsa.',
    pairings: ['House Salad', 'Steamed Cabbage', 'Fried Plantains']
  },
  'shrimp-tacos': {
    title: 'Seasoned Shrimp Tacos with Fresh Slaw',
    preparation: 'Seasoned shrimp is cooked to order, topped with cool fresh slaw and finished with Preva house sauce.',
    occasion: 'The contrast of hot shrimp and crisp slaw makes this the brightest seafood plate on the menu.',
    question: 'What comes on the Shrimp Tacos?',
    answer: 'The tacos are topped with seasoned shrimp, fresh slaw and house sauce. They contain shellfish and gluten.',
    pairings: ['Rice & Peas', 'Fried Plantains', 'House Salad']
  },
  'steak-tacos': {
    title: 'Seasoned Steak Tacos with Slaw and House Sauce',
    preparation: 'Seasoned steak is cooked hot, portioned across the tortillas and topped with fresh slaw and house sauce.',
    occasion: 'Steak Tacos offer a savory beef option with the freshness and portability of the taco format.',
    question: 'What comes on the Steak Tacos?',
    answer: 'The tacos are filled with seasoned steak and topped with fresh slaw and Preva house sauce.',
    pairings: ['Fries', 'Mac & Cheese', 'House Salad']
  },
  'chicken-tacos': {
    title: 'Seasoned Chicken Tacos with Fresh Slaw',
    preparation: 'Seasoned chicken is portioned into tortillas, topped with crisp fresh slaw and finished with house sauce.',
    occasion: 'Chicken Tacos are the most familiar taco choice for an easy lunch or mixed pickup order.',
    question: 'What comes on the Chicken Tacos?',
    answer: 'The tacos are filled with seasoned chicken and topped with fresh slaw and Preva house sauce.',
    pairings: ['Fries', 'House Salad', 'Rice & Peas']
  },
  'preva-catfish': {
    title: 'Crispy Fried Catfish Bites',
    preparation: 'Seasoned catfish is cut into bite-size pieces and fried until the coating is crisp and the fish remains tender.',
    occasion: 'Order it as a shareable seafood starter or add two sides to turn the bites into a complete plate.',
    question: 'Is Preva Catfish a whole fillet?',
    answer: 'No. This menu item is seasoned catfish cut into fried bite-size pieces. For a fuller plate with fries included, choose Catfish Bites with Fries.',
    pairings: ['Collard Greens with Turkey Meat', 'Mac & Cheese', 'Fries']
  },
  'preva-lobster': {
    title: 'Golden Fried Lobster Bites',
    preparation: 'Tender lobster pieces are fried until golden and served with Preva house sauce.',
    occasion: 'Preva Lobster is the premium shareable bite for a seafood-focused order or a starter before an entrée.',
    question: 'Do the Preva Lobster Bites contain shellfish?',
    answer: 'Yes. Lobster is shellfish, and the fried coating contains gluten. Tell the kitchen about any allergy before ordering.',
    pairings: ['Rasta Pasta', 'House Salad', 'Fried Plantains']
  },
  'preva-steak-bites': {
    title: 'Grilled Steak Bites Finished with Garlic Butter',
    preparation: 'Bite-size pieces of seasoned steak are grilled for browned edges and finished with savory garlic butter.',
    occasion: 'They work as a shareable starter or as a protein-centered plate with two comfort-food sides.',
    question: 'How are the Preva Steak Bites finished?',
    answer: 'The seasoned steak bites are grilled and finished with garlic butter, which means the dish contains dairy.',
    pairings: ['Mac & Cheese', 'Preva Yams', 'Steamed Cabbage']
  },
  'veggie-pasta': {
    title: 'Creamy Pasta with Seasonal Vegetables',
    preparation: 'Pasta is coated in a creamy sauce with sautéed bell peppers, sweet onions and seasonal vegetables.',
    occasion: 'Veggie Pasta is the meat-free comfort-food main when you want a full pasta plate without added protein.',
    question: 'Is the Veggie Pasta vegetarian?',
    answer: 'Yes. It is made with vegetables and a creamy sauce, with no meat listed. The pasta contains dairy and gluten.',
    pairings: ['House Salad', 'Steamed Cabbage', 'Fried Plantains']
  },
  'rasta-pasta': {
    title: 'Creamy Caribbean Pasta with Jerk Seasoning',
    preparation: 'Creamy pasta is cooked with bell peppers and Preva house jerk seasoning, with a protein choice available when ordering.',
    occasion: 'Rasta Pasta brings the menu’s Caribbean flavors into a rich, filling main that travels well for pickup.',
    question: 'Can I add protein to the Rasta Pasta?',
    answer: 'Yes. Choose the available protein option when ordering; the live menu offers chicken, shrimp or steak selections.',
    pairings: ['House Salad', 'Fried Plantains', 'Steamed Cabbage']
  },
  'house-salad': {
    title: 'Crisp Greens with Fresh Vegetables',
    preparation: 'Mixed greens are assembled with tomato, red onion and cucumber for a cool, crisp plate.',
    occasion: 'Enjoy it as the menu’s lighter option or use it to balance wings, burgers, pasta or fried bites.',
    question: 'What vegetables come in the House Salad?',
    answer: 'The House Salad includes mixed greens, tomato, red onion and cucumber.',
    pairings: ['Preva Lamb Chops', 'Preva Wings', 'Preva Steak Bites']
  },
  'preva-lamb-chops': {
    title: 'House-Seasoned Grilled Lamb Chops',
    preparation: 'Lamb chops are seasoned with the PREVA house spice blend, grilled and served with a choice of sides.',
    occasion: 'This is the menu’s signature full entrée for a sit-down meal or a substantial pickup order.',
    question: 'Do the Preva Lamb Chops come with sides?',
    answer: 'Yes. The grilled lamb chops are served with a choice of sides; confirm the currently available choices when ordering.',
    pairings: ['Mac & Cheese', 'Collard Greens with Turkey Meat', 'Preva Yams']
  },
  'catfish-bites-with-fries': {
    title: 'A Full Crispy Catfish and Fries Plate',
    preparation: 'Seasoned catfish bites are fried crisp and served as a full plate with seasoned fries.',
    occasion: 'Choose this entrée when you want the catfish bites as a complete meal with the side already included.',
    question: 'What is included with Catfish Bites with Fries?',
    answer: 'The entrée includes a full portion of seasoned fried catfish bites and a side of fries.',
    pairings: ['Collard Greens with Turkey Meat', 'Mac & Cheese', 'Steamed Cabbage']
  },
  'preva-mac-and-cheese': {
    title: 'Baked Macaroni with a Golden Cheese Crust',
    preparation: 'Macaroni is baked in a rich blend of melted cheeses until creamy underneath with a golden top.',
    occasion: 'It is the classic comfort-food side for wings, lamb chops, catfish and steak bites.',
    question: 'Does the Preva Mac and Cheese contain dairy and gluten?',
    answer: 'Yes. The dish contains cheese and pasta, so it includes both dairy and gluten.',
    pairings: ['Preva Lamb Chops', 'Preva Wings', 'Preva Catfish']
  },
  'collard-greens-with-turkey-meat': {
    title: 'Slow-Simmered Greens with Smoked Turkey',
    preparation: 'Collard greens are slow-simmered with seasoned smoked turkey until tender and deeply savory.',
    occasion: 'This is a savory Southern side that balances fried seafood, grilled meat and sweeter sides.',
    question: 'Are the Collard Greens vegetarian?',
    answer: 'No. These collard greens are cooked with smoked turkey meat.',
    pairings: ['Preva Lamb Chops', 'Preva Catfish', 'Mac & Cheese']
  },
  'preva-yams': {
    title: 'Southern Candied Yams with Brown Sugar',
    preparation: 'Yams are baked until soft in a warm brown sugar glaze that clings to each piece.',
    occasion: 'Their sweetness offsets spicy wings, seasoned meat and savory greens on a balanced comfort-food plate.',
    question: 'Are the Preva Yams sweet or savory?',
    answer: 'They are a sweet side: soft yams baked in a brown sugar glaze.',
    pairings: ['Preva Lamb Chops', 'Mac & Cheese', 'Collard Greens with Turkey Meat']
  },
  fries: {
    title: 'Golden Fries Cooked Crisp to Order',
    preparation: 'The fries are cooked until golden and crisp, then finished with Preva house seasoning.',
    occasion: 'Add them to wings, tacos, a burger or bites when the main item does not already include a side.',
    question: 'Are fries included with every burger or wing order?',
    answer: 'Not with every menu item. The Double Smash Burger and Catfish Bites with Fries include fries; otherwise order this side separately.',
    pairings: ['Preva Burger', 'Preva Wings', 'Chicken Tacos']
  },
  'rice-peas': {
    title: 'Caribbean Rice with Kidney Beans and Coconut',
    preparation: 'Rice is simmered with kidney beans, coconut and Caribbean seasoning for a savory, gently aromatic side.',
    occasion: 'Rice & Peas is the natural base for jerk wings, tacos or any plate built around Caribbean flavor.',
    question: 'What is in the Rice & Peas?',
    answer: 'The side combines rice, kidney beans and coconut. It is listed as a vegetarian menu option.',
    pairings: ['Jerk Wings', 'Rasta Pasta', 'Fried Plantains']
  },
  'fried-plantains': {
    title: 'Sweet Plantains with Caramelized Edges',
    preparation: 'Ripe plantain slices are fried until golden, tender inside and caramelized around the edges.',
    occasion: 'Their natural sweetness pairs especially well with jerk spice, seasoned shrimp and creamy Caribbean pasta.',
    question: 'Are the Fried Plantains sweet?',
    answer: 'Yes. Ripe plantains become naturally sweet and caramelized as they fry; no hot seasoning is listed.',
    pairings: ['Jerk Wings', 'Rasta Pasta', 'Shrimp Tacos']
  },
  'steamed-cabbage': {
    title: 'A Light, Tender Vegetable Side',
    preparation: 'Cabbage is lightly seasoned and cooked until tender while keeping the dish simple and vegetable-forward.',
    occasion: 'Choose Steamed Cabbage to add a lighter savory side beside pasta, grilled meat or fried seafood.',
    question: 'Is the Steamed Cabbage a vegan option?',
    answer: 'The menu lists Steamed Cabbage as vegan. If you have a strict dietary requirement, confirm current preparation with the kitchen.',
    pairings: ['Veggie Pasta', 'Rice & Peas', 'Preva Lamb Chops']
  },
  'oxtail-quesadilla': {
    title: 'Slow-Braised Oxtail in a Grilled Quesadilla',
    preparation: 'Slow-braised oxtail, melted cheese and peppers are folded into a flour tortilla and grilled until hot and crisp.',
    occasion: 'This is the richest quesadilla option, combining a long-cooked beef filling with the texture of a grilled tortilla.',
    question: 'What is inside the Oxtail Quesadilla?',
    answer: 'It is filled with slow-braised oxtail, melted cheese and peppers in a grilled flour tortilla.',
    pairings: ['House Salad', 'Steamed Cabbage', 'Rice & Peas']
  },
  'rice-and-black-beans': {
    title: 'Seasoned Rice with Savory Black Beans',
    preparation: 'Seasoned rice and savory black beans come together as a simple, filling side.',
    occasion: 'Use it as a base for wings, tacos or steak bites when you want a heartier alternative to fries.',
    question: 'What is in the Rice and Black Beans?',
    answer: 'This side combines seasoned rice with savory black beans. Ask the kitchen about the day’s preparation for strict dietary needs.',
    pairings: ['Jerk Wings', 'Chicken Tacos', 'Preva Steak Bites']
  },
  'collard-greens-turkey': {
    title: 'Savory Collard Greens Cooked with Turkey',
    preparation: 'Collard greens are cooked low and slow with savory turkey meat until the leaves become tender and well seasoned.',
    occasion: 'Add this savory vegetable side beside fried catfish, lamb chops or a sweeter serving of yams.',
    question: 'Do the Collard Greens with Turkey Meat contain meat?',
    answer: 'Yes. This version of collard greens is cooked with turkey meat and is not vegetarian.',
    pairings: ['Catfish Bites', 'Lamb Chops', 'Yams']
  },
  'red-wine-poached-pear': {
    title: 'Pear Gently Poached in Spiced Red Wine',
    preparation: 'A ripe pear is gently poached in spiced red wine with cinnamon, star anise and a vanilla finish.',
    occasion: 'This is the menu’s composed dessert for a lighter, fruit-led finish after a savory meal.',
    question: 'Does the Red Wine Poached Pear contain alcohol?',
    answer: 'The pear is prepared in red wine. Cooking reduces alcohol but may not remove every trace, so ask the kitchen if avoidance is important.',
    pairings: ['Preva Lamb Chops', 'Rasta Pasta', 'House Salad']
  }
};

const PROFILE_ALIASES = {
  'lamb-chops': 'preva-lamb-chops',
  'catfish-bites': 'preva-catfish',
  'lobster-bites': 'preva-lobster',
  'steak-bites': 'preva-steak-bites',
  'mac-and-cheese': 'preva-mac-and-cheese',
  'collard-greens-turkey': 'collard-greens-with-turkey-meat',
  yams: 'preva-yams'
};

const CATEGORY_COPY = {
  'Preva Wings': ['Crispy Wings Made in Redford, MI', 'Wings are cooked to order and finished with the selected seasoning or sauce.', 'They work well for lunch, sharing or delivery.'],
  'Preva Burger': ['Made-to-Order Burgers in Redford, MI', 'The burger is cooked and assembled to order.', 'Enjoy it for lunch, dine-in or delivery.'],
  Quesadillas: ['Grilled Quesadillas in Redford, MI', 'The tortilla is grilled until crisp around its hot filling.', 'Order one as a meal or a shareable plate.'],
  Tacos: ['Fresh Tacos in Redford, MI', 'The tacos are assembled to order with seasoned filling and fresh toppings.', 'They are an easy lunch or pickup choice.'],
  'Preva Bites': ['Shareable Bites in Redford, MI', 'The bites are prepared to order and served hot.', 'Enjoy them as a starter or build a plate with sides.'],
  Pasta: ['Comforting Pasta in Redford, MI', 'The pasta and sauce are finished together while hot.', 'It is a filling pickup or delivery choice.'],
  Salads: ['Fresh Salads in Redford, MI', 'The salad is assembled to order with crisp produce.', 'Enjoy it alone or beside a signature dish.'],
  'Entrées': ['Signature Entrées in Redford, MI', 'The entrée is prepared to order by the Preva kitchen.', 'It is suited to dine-in, pickup or delivery.'],
  Sides: ['House-Made Sides in Redford, MI', 'The side is prepared with the same care as the main menu.', 'Add it to an entrée or combine several sides.'],
  Dessert: ['A Sweet Finish in Redford, MI', 'The dessert is prepared as a thoughtful finish.', 'Add it after a dine-in meal or to a pickup order.']
};

function asList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
  return [];
}

function profileFor(dish) {
  const slug = String(dish?.slug || '').toLowerCase();
  return DISH_DETAIL_PROFILES[slug] || DISH_DETAIL_PROFILES[PROFILE_ALIASES[slug]] || null;
}

export function hasCuratedDishProfile(dish) {
  return Boolean(profileFor(dish));
}

function fallbackFor(dish) {
  const [title, preparation, occasion] = CATEGORY_COPY[dish?.category] || [
    'Made Fresh in Redford, MI',
    `${dish?.name || 'This dish'} is prepared fresh by the Preva kitchen.`,
    'Enjoy it for dine-in, weekday pickup or delivery.'
  ];
  return { title, preparation, occasion };
}

function pairingsFor(dish, profile) {
  return profile?.pairings?.length ? profile.pairings : asList(dish?.pairings);
}

export function getDefaultAboutTitle(dish) {
  const content = profileFor(dish) || fallbackFor(dish);
  return `About ${dish?.name || 'this dish'} — ${content.title}`;
}

export function getDefaultAboutParagraphs(dish) {
  const name = dish?.name || 'This dish';
  const price = dish?.price ? ` for ${dish.price}` : '';
  const description = String(dish?.description || `${name} is prepared fresh by the Preva kitchen.`).trim();
  const content = profileFor(dish) || fallbackFor(dish);
  const pairings = pairingsFor(dish, content);
  return [
    `${description} Order it${price} at ${LOCATION}.`,
    content.preparation,
    content.occasion,
    `Order ${name} for pickup or delivery ${HOURS}. Dine in, order online, or call (313) 286-3586 for pickup.`,
    pairings.length
      ? `Build the plate with ${pairings.slice(0, 3).join(', ')} — sensible pairings available from the same menu.`
      : 'Pair it with one of Preva’s house-made sides or another signature menu favorite.'
  ];
}

export function parseAboutContent(value, dish) {
  if (Array.isArray(value)) {
    const paragraphs = value.map((item) => String(item || '').trim()).filter(Boolean);
    if (paragraphs.length) return paragraphs;
  }
  if (typeof value === 'string' && value.trim()) {
    return value.split(/\r?\n\s*\r?\n/).map((item) => item.trim()).filter(Boolean);
  }
  return getDefaultAboutParagraphs(dish);
}

export function getDefaultFaqs(dish) {
  const name = dish?.name || 'this dish';
  const price = dish?.price || 'the current menu price';
  const description = dish?.description || `${name} is prepared fresh to order with Preva’s house seasoning.`;
  const content = profileFor(dish) || fallbackFor(dish);
  const pairings = pairingsFor(dish, content);
  const pairingText = pairings.length ? pairings.slice(0, 3).join(', ') : 'Preva’s signature sides and menu favorites';
  return [
    { q: `What is the ${name} at Preva Kitchen & Lounge?`, a: `${description} ${content.preparation}` },
    { q: `How much does the ${name} cost?`, a: `The ${name} costs ${price} at Preva Kitchen & Lounge in Redford Township, MI. Prices on delivery apps may vary slightly.` },
    content.question && content.answer
      ? { q: content.question, a: content.answer }
      : { q: `Where can I order the ${name} near me?`, a: `The ${name} is served at ${LOCATION}. Dine in, call +1 313-286-3586 for pickup, or order online for delivery.` },
    { q: `Can I get the ${name} delivered in Redford Township?`, a: `Yes — order the ${name} for delivery from the Preva online shop during kitchen hours, or call +1 313-286-3586 to arrange pickup from 13090 Inkster Rd.` },
    { q: `What goes well with the ${name}?`, a: `Recommended pairings are ${pairingText}. They can be added to the same pickup or delivery order.` }
  ];
}

export function getDishFaqs(dish) {
  const custom = Array.isArray(dish?.faqs)
    ? dish.faqs
        .map((faq) => ({ q: String(faq?.q || '').trim(), a: String(faq?.a || '').trim() }))
        .filter((faq) => faq.q && faq.a)
    : [];
  return custom.length ? custom : getDefaultFaqs(dish);
}
