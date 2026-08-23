"use client";
import Link from 'next/link';

export default function Nav() {
  return (
    <nav className="site-nav">
      <Link href="/">Home</Link>
      <Link href="/blog">Journal</Link>
      <Link href="/preva-kitchen">Kitchen</Link>
      <Link href="/contact">Contact</Link>
    </nav>
  );
}
