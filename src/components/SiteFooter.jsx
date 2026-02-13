export default function SiteFooter() {
    return (
        <footer className="site-footer" role="contentinfo">
            <div className="site-footer__inner">
                <span>Designed by Mobo Digital</span>
                <span className="site-footer__dot" aria-hidden="true">|</span>
                <span>
                    For questions and enquiries:{' '}
                    <a className="site-footer__link" href="mailto:olajideayeola@gmail.com">
                        olajideayeola@gmail.com
                    </a>
                </span>
                <span className="site-footer__dot" aria-hidden="true">|</span>
                <span>
                    WhatsApp:{' '}
                    <a
                        className="site-footer__link"
                        href="https://wa.me/2348112287258"
                        target="_blank"
                        rel="noreferrer"
                    >
                        08112287258
                    </a>
                </span>
                <span className="site-footer__dot" aria-hidden="true">|</span>
                <span>Copyright 2026</span>
            </div>
        </footer>
    )
}
