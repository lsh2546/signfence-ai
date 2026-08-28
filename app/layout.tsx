import type { Metadata } from 'next';
import './globals.css';
import './qa.css';
import './international.css';
const title='SignFence AI | Human-gated document signing';
const description='Explainable document agent with a deterministic human signing boundary, powered by Foxit MCP and eSign.';
const socialImage='https://raw.githubusercontent.com/lsh2546/signfence-ai/main/public/og.png';
export const metadata:Metadata={title,description,openGraph:{title,description,images:[{url:socialImage,width:1200,height:630,alt:'SignFence AI — The agent prepares. The human decides.'}]},twitter:{card:'summary_large_image',title,description,images:[socialImage]}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>}
