export const careerJobs = [
  {
    slug: 'prep-cook-redford',
    title: 'Prep Cook',
    department: 'Preva Kitchen',
    location: 'Redford Township, MI',
    badge: 'Priority opening',
    type: 'Part-time / Full-time',
    schedule: 'Days, evenings & weekends',
    pay: 'Pay range pending confirmation',
    intro: 'Help every service start strong by preparing fresh ingredients, stocking stations, and keeping the kitchen organized and ready for the rush.',
    responsibilities: [
      'Wash, cut, portion, label, and store ingredients to Preva standards.',
      'Stock line stations and communicate low ingredients before service.',
      'Follow recipes, portion guides, food-safety, and sanitation procedures.',
      'Keep prep tables, coolers, tools, and storage areas clean and organized.',
      'Support Line Cooks and the Chef with daily prep and closing checklists.'
    ],
    qualifications: [
      'Dependable, organized, and comfortable in a fast-moving kitchen.',
      'Able to stand, lift, bend, and safely complete repetitive prep work.',
      'Willingness to follow recipes and food-safety standards consistently.',
      'Previous prep or kitchen experience is helpful; training is available.'
    ],
    growth: 'Strong performers can build station skills and cross-train toward a future Line Cook role.',
    interview: '20–30 minute interview',
    trial: false,
    image: '/asset/careers/preva-team-culture-v2.png'
  },
  {
    slug: 'dishwasher-redford',
    title: 'Dishwasher',
    department: 'Preva Kitchen',
    location: 'Redford Township, MI',
    badge: 'Ongoing hiring',
    type: 'Part-time / Full-time',
    schedule: 'Flexible shifts',
    pay: 'Pay range pending confirmation',
    intro: 'Be the dependable force that keeps the kitchen clean, stocked, and ready for service. This is a hands-on role with a clear path to learn more.',
    responsibilities: [
      'Wash and sanitize dishes, cookware, utensils, and kitchen equipment.',
      'Maintain clean dish, prep, storage, and waste areas throughout the shift.',
      'Support waste removal, basic organization, and closing checklists.',
      'Follow food-safety, chemical-handling, and sanitation procedures.',
      'Report low supplies or equipment concerns to the shift lead.'
    ],
    qualifications: [
      'Reliable attendance and a team-first work style.',
      'Able to stand, lift, bend, and work around heat and water.',
      'Willingness to follow safety and cleaning standards consistently.',
      'No restaurant experience is required; training is provided.'
    ],
    growth: 'Cross-training opportunities may include prep support and a future Line Cook path.',
    interview: '20–30 minute interview',
    trial: false,
    image: '/asset/careers/preva-team-culture-v2.png'
  },
  {
    slug: 'line-cook-redford',
    title: 'Line Cook',
    department: 'Preva Kitchen',
    location: 'Redford Township, MI',
    badge: 'Growth opportunity',
    type: 'Part-time / Full-time',
    schedule: 'Days, evenings & weekends',
    pay: 'Pay range pending confirmation',
    intro: 'Bring consistency, speed, and care to every plate. You will own your station while working closely with the Chef and the rest of the kitchen team.',
    responsibilities: [
      'Prepare menu items consistently, safely, and to Preva standards.',
      'Set up, maintain, and close an organized and service-ready station.',
      'Protect quality, portion control, timing, and presentation.',
      'Communicate clearly with the Chef and teammates during service.',
      'Receive, rotate, label, and store ingredients correctly.'
    ],
    qualifications: [
      'Working knowledge of food safety and kitchen sanitation.',
      'Organized, steady, and able to manage multiple tickets.',
      'Previous cooking experience is preferred.',
      'Coachability, pride in execution, and dependable attendance.'
    ],
    growth: 'Develop station leadership, menu knowledge, and the skills needed for future Chef opportunities.',
    interview: '30–45 minute interview',
    trial: true,
    image: '/asset/careers/preva-team-culture-v2.png'
  },
  {
    slug: 'chef-redford',
    title: 'Chef',
    department: 'Preva Kitchen',
    location: 'Redford Township, MI',
    badge: 'Leadership role',
    type: 'Full-time',
    schedule: 'Flexible leadership schedule',
    pay: 'Pay range pending confirmation',
    intro: 'Lead a kitchen built around standards, accountability, and memorable food. This role owns daily execution while helping the team grow.',
    responsibilities: [
      'Lead daily kitchen operations, service readiness, and shift execution.',
      'Coach, schedule, train, and hold the culinary team accountable.',
      'Manage quality, food cost, waste, inventory, ordering, and vendors.',
      'Support menu development and practical operational improvements.',
      'Maintain food-safety, sanitation, and workplace standards.'
    ],
    qualifications: [
      'Kitchen leadership experience with strong operating standards.',
      'Knowledge of food safety, inventory, labor, and cost control.',
      'Clear communication, sound judgment, and a coaching mindset.',
      'Two professional references and availability for a paid trial shift.'
    ],
    growth: 'A documented 30/60/90-day plan supports ownership of people, product, cost, and kitchen performance.',
    interview: '45–60 minute leadership interview',
    trial: true,
    image: '/asset/careers/preva-careers-hero.png'
  },
  {
    slug: 'janitorial-team-member-redford',
    title: 'Janitorial Team Member',
    department: 'Preva Kitchen',
    location: 'Redford Township, MI',
    badge: 'Ongoing hiring',
    type: 'Part-time',
    schedule: 'After-hours shifts',
    pay: 'Pay range pending confirmation',
    intro: 'Create the clean, polished environment every guest and team member expects. Your attention to detail protects the entire Preva experience.',
    responsibilities: [
      'Clean and sanitize dining, kitchen, restroom, office, and common areas.',
      'Use approved equipment and cleaning chemicals safely.',
      'Complete opening, closing, and deep-clean checklists accurately.',
      'Remove waste, restock supplies, and maintain organized storage.',
      'Report maintenance, safety, or supply concerns promptly.'
    ],
    qualifications: [
      'Reliable, detail-oriented, and able to work independently.',
      'Able to stand, lift, bend, and complete physical cleaning tasks.',
      'Available for scheduled after-hours work.',
      'Willing to complete required background screening.'
    ],
    growth: 'Consistent team members may cross-train into facilities support or other available Preva roles.',
    interview: '20–30 minute interview',
    trial: false,
    image: '/asset/careers/preva-team-culture-v2.png'
  }
];

export function getCareerJob(slug) {
  return careerJobs.find((job) => job.slug === slug);
}
