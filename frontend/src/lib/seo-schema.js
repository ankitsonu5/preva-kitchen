/**
 * Preva Kitchen - Advanced SEO Schema.org JSON-LD Generator
 * Supports Google Rich Snippets: Restaurant, LocalBusiness, Organization, WebSite,
 * BlogPosting, BreadcrumbList, FAQPage, Recipe, Menu, MenuItem, Person, and VideoObject.
 */

export const BUSINESS_INFO = {
  name: 'Preva Kitchen',
  legalName: 'Preva Kitchen LLC',
  url: 'https://prevakitchen.com',
  logo: 'https://prevakitchen.com/asset/preva-logo.svg',
  image: 'https://prevakitchen.com/asset/home-reference/preva-restaurant-hero.png',
  telephone: '+1-313-286-3586',
  email: 'info@prevakitchen.com',
  priceRange: '$$',
  servesCuisine: ['American', 'Southern Comfort Food', 'Seafood', 'Caribbean'],
  address: {
    '@type': 'PostalAddress',
    streetAddress: '13090 Inkster Rd',
    addressLocality: 'Redford Township',
    addressRegion: 'MI',
    postalCode: '48239',
    addressCountry: 'US'
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: '42.3814',
    longitude: '-83.3094'
  },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '17:00',
      closes: '22:00'
    }
  ],
  sameAs: [
    'https://www.instagram.com/prevakitchen/',
    'https://www.facebook.com/prevakitchen'
  ]
};

/**
 * Site-wide schema graph (Restaurant, LocalBusiness, Organization, WebSite)
 */
export function generateSiteWideSchema(origin = 'https://prevakitchen.com') {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Restaurant',
        '@id': `${origin}/#restaurant`,
        name: BUSINESS_INFO.name,
        legalName: BUSINESS_INFO.legalName,
        url: origin,
        logo: `${origin}/asset/preva-logo.svg`,
        image: `${origin}/asset/home-reference/preva-restaurant-hero.png`,
        description: 'Chef-driven comfort food, dine-in, pickup, delivery and group catering in Redford Township, Michigan.',
        telephone: BUSINESS_INFO.telephone,
        email: BUSINESS_INFO.email,
        priceRange: BUSINESS_INFO.priceRange,
        servesCuisine: BUSINESS_INFO.servesCuisine,
        address: BUSINESS_INFO.address,
        geo: BUSINESS_INFO.geo,
        openingHoursSpecification: BUSINESS_INFO.openingHoursSpecification,
        acceptsReservations: 'True',
        hasMenu: `${origin}/menu`,
        sameAs: BUSINESS_INFO.sameAs,
        potentialAction: [
          {
            '@type': 'ReserveAction',
            target: {
              '@type': 'EntryPoint',
              urlTemplate: `${origin}/#prv-reservations`,
              inLanguage: 'en-US',
              actionPlatform: [
                'http://schema.org/DesktopWebPlatform',
                'http://schema.org/MobileWebPlatform'
              ]
            },
            result: {
              '@type': 'FoodEstablishmentReservation',
              name: 'Table Reservation at Preva Kitchen'
            }
          },
          {
            '@type': 'OrderAction',
            target: {
              '@type': 'EntryPoint',
              urlTemplate: `${origin}/menu`,
              inLanguage: 'en-US',
              actionPlatform: [
                'http://schema.org/DesktopWebPlatform',
                'http://schema.org/MobileWebPlatform'
              ]
            }
          }
        ]
      },
      {
        '@type': 'Organization',
        '@id': `${origin}/#organization`,
        name: BUSINESS_INFO.name,
        url: origin,
        logo: {
          '@type': 'ImageObject',
          url: `${origin}/asset/preva-logo.svg`,
          width: '280',
          height: '80'
        },
        contactPoint: {
          '@type': 'ContactPoint',
          telephone: BUSINESS_INFO.telephone,
          contactType: 'customer service',
          areaServed: 'US',
          availableLanguage: 'English'
        },
        sameAs: BUSINESS_INFO.sameAs
      },
      {
        '@type': 'WebSite',
        '@id': `${origin}/#website`,
        url: origin,
        name: BUSINESS_INFO.name,
        publisher: { '@id': `${origin}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${origin}/blog?s={search_term_string}`
          },
          'query-input': 'required name=search_term_string'
        }
      }
    ]
  };
}

/**
 * BreadcrumbList schema helper
 */
export function generateBreadcrumbSchema(items = [], origin = 'https://prevakitchen.com') {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url?.startsWith('http') ? item.url : `${origin}${item.url}`
    }))
  };
}

/**
 * Auto-extract FAQ Q&As from HTML content (looks for <h2>/<h3> questions or FAQ patterns)
 */
export function extractFaqsFromContent(htmlContent = '') {
  if (!htmlContent) return [];
  const faqs = [];
  
  // Match <h2> or <h3> ending with ? or starting with FAQ / Question
  const headingRegex = /<h[23][^>]*>(.*?)<\/h[23]>([\s\S]*?)(?=<h[23]|$)/gi;
  let match;

  while ((match = headingRegex.exec(htmlContent)) !== null) {
    const questionText = match[1].replace(/<[^>]+>/g, '').trim();
    const answerHtml = match[2].trim();
    const answerText = answerHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    if (
      (questionText.endsWith('?') || /^(what|how|why|when|where|who|is|are|can|do|does)/i.test(questionText)) &&
      answerText.length >= 20 &&
      answerText.length <= 800
    ) {
      faqs.push({
        question: questionText,
        answer: answerText
      });
    }
  }

  return faqs.slice(0, 8);
}

/**
 * Individual Blog Post schema with Article, Breadcrumbs, FAQ, Recipe, Author
 */
export function generateBlogPostSchema(post, origin = 'https://prevakitchen.com') {
  if (!post) return null;

  const articleUrl = `${origin}/blog/${encodeURIComponent(post.slug)}`;
  const title = post.seoTitle || post.title || 'Preva Kitchen Story';
  const description = post.seoDescription || post.excerpt || String(post.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
  const image = post.ogImage || post.featuredImage || `${origin}/asset/home-reference/preva-restaurant-hero.png`;
  const authorName = post.author?.name || 'Preva Kitchen Culinary Team';
  const publishedDate = post.publishedAt || post.createdAt || new Date().toISOString();
  const modifiedDate = post.updatedAt || publishedDate;
  const categoryName = post.categories?.[0]?.category?.name || post.categories?.[0]?.name || 'Culinary Journal';

  const graph = [
    // 1. Article / BlogPosting Schema
    {
      '@type': 'BlogPosting',
      '@id': `${articleUrl}/#article`,
      isPartOf: { '@id': `${origin}/#website` },
      author: {
        '@type': 'Person',
        name: authorName,
        jobTitle: 'Executive Chef & Culinary Contributor',
        worksFor: { '@id': `${origin}/#organization` }
      },
      headline: title,
      description: description,
      datePublished: publishedDate,
      dateModified: modifiedDate,
      mainEntityOfPage: articleUrl,
      wordCount: String(post.content || '').replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length,
      publisher: {
        '@type': 'Organization',
        name: BUSINESS_INFO.name,
        logo: {
          '@type': 'ImageObject',
          url: `${origin}/asset/preva-logo.svg`
        }
      },
      image: {
        '@type': 'ImageObject',
        url: image,
        width: '1200',
        height: '630'
      },
      articleSection: categoryName,
      inLanguage: 'en-US',
      keywords: [
        post.focusKeyword,
        ...(post.tags || []).map(t => t.tag?.name || t.name).filter(Boolean),
        'Preva Kitchen',
        'Redford MI Food'
      ].filter(Boolean).join(', ')
    },

    // 2. BreadcrumbList Schema
    generateBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Blog', url: '/blog' },
      { name: title, url: `/blog/${post.slug}` }
    ], origin)
  ];

  // 3. Auto FAQ Schema if FAQs found in post content
  const detectedFaqs = extractFaqsFromContent(post.content);
  if (detectedFaqs.length > 0) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${articleUrl}/#faq`,
      mainEntity: detectedFaqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer
        }
      }))
    });
  }

  // 4. Recipe Schema if post is tagged/categorized as Recipe or has recipe data
  const isRecipe = /recipe|how to cook|dish preparation|cooking guide/i.test(`${post.title} ${categoryName} ${post.tags?.map(t=>t.name||t.tag?.name).join(' ')}`);
  if (isRecipe) {
    graph.push({
      '@type': 'Recipe',
      '@id': `${articleUrl}/#recipe`,
      name: post.title,
      image: [image],
      author: {
        '@type': 'Person',
        name: authorName
      },
      datePublished: publishedDate,
      description: description,
      recipeCuisine: 'American / Southern',
      recipeCategory: categoryName,
      keywords: post.focusKeyword || 'Preva Kitchen Recipe, Homemade Comfort Food',
      suitableForDiet: 'https://schema.org/HalalDiet',
      publisher: {
        '@type': 'Organization',
        name: BUSINESS_INFO.name,
        logo: { '@type': 'ImageObject', url: `${origin}/asset/preva-logo.svg` }
      }
    });
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph
  };
}

/**
 * Menu & Shop page schema with Menu and MenuItem items
 */
export function generateMenuPageSchema(products = [], origin = 'https://prevakitchen.com') {
  const menuItems = (products || []).map((item) => ({
    '@type': 'MenuItem',
    name: item.name || item.title,
    description: item.description || item.excerpt || 'Signature fresh plate at Preva Kitchen.',
    image: item.image || item.featuredImage || `${origin}/asset/home-reference/preva-restaurant-hero.png`,
    offers: {
      '@type': 'Offer',
      price: item.price ? Number(item.price).toFixed(2) : '12.00',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: `${origin}/menu/${item.slug || ''}`
    },
    suitableForDiet: 'https://schema.org/HalalDiet'
  }));

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Menu',
        '@id': `${origin}/menu/#menu`,
        name: 'Preva Kitchen Food & Drink Menu',
        description: 'Chef-prepared wings, steak bites, seafood, signature pasta and comfort bowls in Redford Township, MI.',
        inLanguage: 'en-US',
        hasMenuItem: menuItems
      },
      generateBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Menu', url: '/menu' }
      ], origin)
    ]
  };
}
