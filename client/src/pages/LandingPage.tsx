import React from 'react';
import { Icon } from '../components/ui/Icon';
import { Link } from 'react-router-dom';

const FeatureCard: React.FC<{ icon: string; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="card bg-base-200/50 shadow-lg">
        <div className="card-body items-center text-center p-8">
            <div className="p-4 bg-primary/10 rounded-full">
                 <Icon name={icon} className="w-8 h-8 text-primary" />
            </div>
            <h3 className="card-title mt-4 text-xl font-bold">{title}</h3>
            <p className="text-base-content/70 leading-relaxed">{children}</p>
        </div>
    </div>
);

export const LandingPage: React.FC = () => {

    return (
        <div data-theme="light" className="bg-base-100 text-base-content font-sans leading-normal">
            {/* Header */}
            <header className="bg-base-100/80 backdrop-blur-sm sticky top-0 z-50 border-b border-base-200">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="navbar">
                        <div className="navbar-start">
                            <div className="flex items-center space-x-3">
                                <Icon name="mcmLogo" className="w-10 h-10 text-primary" />
                                <span className="text-2xl font-bold">MCM Alerts</span>
                            </div>
                        </div>
                        <div className="navbar-center hidden lg:flex">
                            <ul className="menu menu-horizontal px-1 font-medium">
                                <li><a href="#features" className="hover:text-primary">Features</a></li>
                                <li><a href="#how-it-works" className="hover:text-primary">How It Works</a></li>
                                <li><a href="#showcase" className="hover:text-primary">Showcase</a></li>
                            </ul>
                        </div>
                        <div className="navbar-end">
                            <Link to="/signup" className="btn btn-ghost hidden sm:inline-flex">Sign Up</Link>
                            <Link to="/login" className="btn btn-primary ml-2">Login</Link>
                        </div>
                    </div>
                </div>
            </header>

            <main>
                {/* Hero Section */}
                <section className="hero min-h-[85vh] bg-base-200/30">
                    <div className="hero-content text-center py-20">
                        <div className="max-w-4xl">
                             <div className="badge badge-primary badge-lg mb-4 font-semibold">Now in Public Beta!</div>
                            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-5 leading-tight">
                                Actionable Alerts for Modern Teams
                            </h1>
                            <p className="max-w-3xl mx-auto text-xl text-base-content/80 mb-10">
                                MCM Alerts provides a robust, centralized system for instant event notification and incident management, designed for teams that demand reliability and speed.
                            </p>
                            <div className="flex justify-center gap-4">
                                <Link to="/signup" className="btn btn-primary btn-lg shadow-lg">Get Started for Free</Link>
                                <a href="#showcase" className="btn btn-ghost btn-lg">See the Dashboard</a>
                            </div>
                        </div>
                    </div>
                </section>
                
                {/* Features Section */}
                <section id="features" className="py-24 bg-base-100">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16 max-w-3xl mx-auto">
                            <h2 className="text-4xl md:text-5xl font-bold">Why Choose MCM Alerts?</h2>
                            <p className="text-lg text-base-content/70 mt-5">Powerful features designed for clarity, speed, and immediate action when it matters most.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <FeatureCard icon="grid" title="Centralized Dashboard">
                                Get a bird's-eye view of all system alerts in one place. Filter, sort, and manage notifications efficiently with real-time updates.
                            </FeatureCard>
                            <FeatureCard icon="bell" title="Multi-Channel Alerts">
                                Receive critical alerts via push notifications, email, and sound alerts, ensuring you never miss an important event.
                            </FeatureCard>
                            <FeatureCard icon="messageSquare" title="Flexible API">
                                Integrate with any monitoring system, from custom scripts to enterprise tools, using our simple yet powerful REST API.
                            </FeatureCard>
                            <FeatureCard icon="users" title="Team Collaboration">
                                Comment on alerts, assign responsibilities, track resolution progress, and maintain clear communication channels.
                            </FeatureCard>
                            <FeatureCard icon="barChart" title="Comprehensive Audit Logs">
                                Maintain a complete and searchable history of all alerts, actions, and responses for compliance and performance review.
                            </FeatureCard>
                            <FeatureCard icon="sliders" title="Advanced Controls">
                                Customize your notification experience with granular settings, smart filtering, snoozing capabilities, and priority levels.
                            </FeatureCard>
                        </div>
                    </div>
                </section>

                {/* How It Works Section */}
                <section id="how-it-works" className="py-24 bg-base-200/30">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                         <div className="text-center mb-20 max-w-3xl mx-auto">
                            <h2 className="text-4xl md:text-5xl font-bold">Get Started in 3 Simple Steps</h2>
                        </div>
                        <ul className="timeline max-w-3xl mx-auto">
                            <li>
                                <div className="timeline-start timeline-box shadow-md">
                                    <h3 className="font-bold text-lg">1. Integrate Your Systems</h3>
                                    <p className="text-sm text-base-content/70 mt-1">Use our flexible API to send events from your existing monitoring tools, applications, or infrastructure.</p>
                                </div>
                                <div className="timeline-middle"><Icon name="git-branch" className="w-7 h-7 text-primary"/></div>
                                <hr/>
                            </li>
                            <li>
                                <hr/>
                                <div className="timeline-middle"><Icon name="settings-2" className="w-7 h-7 text-primary"/></div>
                                <div className="timeline-end timeline-box shadow-md">
                                    <h3 className="font-bold text-lg">2. Configure Your Topics</h3>
                                    <p className="text-sm text-base-content/70 mt-1">Create topics for different alert types (e.g., 'Production DB', 'Billing API') and set their priority levels.</p>
                                </div>
                                <hr/>
                            </li>
                            <li>
                                <hr/>
                                <div className="timeline-middle"><Icon name="bell" className="w-7 h-7 text-primary"/></div>
                                <div className="timeline-start timeline-box shadow-md">
                                    <h3 className="font-bold text-lg">3. Receive Actionable Alerts</h3>
                                    <p className="text-sm text-base-content/70 mt-1">Get notified instantly and manage incidents effectively from the central dashboard.</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                </section>

                {/* Showcase Section */}
                <section id="showcase" className="py-24 bg-base-100">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-4xl md:text-5xl font-bold">A Dashboard Built for Clarity</h2>
                             <p className="text-lg text-base-content/70 mt-5 max-w-3xl mx-auto">From a high-level overview to the smallest detail, get the full picture without the noise.</p>
                        </div>
                        <div className="mockup-browser border bg-base-300 shadow-2xl">
                            <div className="mockup-browser-toolbar">
                                <div className="input">https://mcm-alerts.app/dashboard</div>
                            </div>
                            <div className="flex justify-center bg-base-200/50">
                                <img src="/img/dashboard-screenshot.png" alt="MCM Alerts Dashboard" className="w-full" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                 <section className="hero bg-gradient-to-r from-primary to-secondary text-primary-content">
                    <div className="hero-content text-center py-20 px-4">
                        <div className="max-w-2xl">
                            <h2 className="text-3xl md:text-5xl font-bold">Ready to Take Control of Your Alerts?</h2>
                            <p className="py-6 text-lg">Stop letting critical events get lost in the noise. Sign up for MCM Alerts today and experience a new level of operational awareness.</p>
                            <Link to="/signup" className="btn btn-neutral btn-lg shadow-lg">Sign Up Now</Link>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="footer p-10 bg-base-300 text-base-content">
                <aside>
                    <Icon name="mcmLogo" className="w-10 h-10 text-primary" />
                    <p className="font-bold text-lg">MCM Alerts</p>
                    <p>Providing reliable monitoring since 2023</p>
                </aside>
                <nav>
                    <h6 className="footer-title">Product</h6> 
                    <a href="#features" className="link link-hover">Features</a>
                    <a href="#how-it-works" className="link link-hover">How it Works</a>
                    <a href="#showcase" className="link link-hover">Showcase</a>
                </nav> 
                <nav>
                    <h6 className="footer-title">Company</h6> 
                    <a className="link link-hover">About us</a>
                    <a className="link link-hover">Contact</a>
                </nav> 
                 <nav>
                    <h6 className="footer-title">Legal</h6> 
                    <a className="link link-hover">Terms of use</a>
                    <a className="link link-hover">Privacy policy</a>
                </nav>
            </footer>
            <div className="footer footer-center p-4 bg-base-300 text-base-content border-t border-base-content/10">
                <aside>
                    <p>&copy; {new Date().getFullYear()} MCM Alerts. All rights reserved.</p>
                </aside>
            </div>
        </div>
    );
};