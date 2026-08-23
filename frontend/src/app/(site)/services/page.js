import Link from 'next/link';
import { cmsFetch } from '@/lib/cms';

export const metadata = {
  title: 'Experiences',
  description: 'Discover dining, catering and ordering services from Preva Kitchen.',
  alternates: { canonical: '/services' }
};

export default async function ServicesPage() {
  const services = (await cmsFetch('/services') || []).filter((service) => !/night\s*life|night\s*club|\bclub\b|\bvip\b|bottle service|\bdj\b/i.test(`${service.title || ''} ${service.excerpt || ''}`));
  return <main className="site-main single-post-luxury"><section className="blog-hero"><div className="overlay" /><div className="container relative-z2"><p className="blog-breadcrumbs">PREVA / EXPERIENCES</p><h1 className="blog-title-large">Experiences</h1></div></section><section className="container cms-listing-grid">{services.map((service) => <Link className="cms-listing-card" href={`/services/${service.slug}`} key={service.id}>{service.image && <img src={service.image} alt={service.title} />}<div><span>PREVA EXPERIENCE</span><h2>{service.title}</h2><p>{service.excerpt}</p></div></Link>)}{!services.length && <div className="cms-public-empty"><h2>No experiences published yet</h2></div>}</section></main>;
}
