import { useEffect, useState } from 'react';
import './IOSInstallModal.css';

/**
 * IOSInstallModal Component
 * 
 * Feature 012: PWA Distribution - iOS Install Instructions
 * 
 * Displays manual install instructions for iOS/iPad users who visit the PWA
 * in Safari but haven't added it to their home screen. iOS doesn't support
 * the BeforeInstallPrompt API, so we provide visual instructions.
 * 
 * Detection Logic:
 * - Shows if iOS/iPadOS detected (navigator.platform check)
 * - Hides if already in standalone mode (installed)
 * - Respects localStorage dismissal (user clicked "Got it")
 * 
 * Usage:
 * <IOSInstallModal />
 */
export const IOSInstallModal: React.FC = () => {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Detect iOS (iPad, iPhone, iPod) or iPad Pro with touchscreen
    // iPad Pro reports as 'MacIntel' but has touch support
    const isIOS = /iPad|iPhone|iPod/.test(navigator.platform) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    // Check if user is already in standalone mode (PWA installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    // Show modal only if iOS and not installed, and user hasn't dismissed it
    if (isIOS && !isStandalone) {
      const dismissed = localStorage.getItem('ios-install-dismissed');
      if (!dismissed) {
        setShowModal(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    // Remember dismissal to avoid annoying user
    localStorage.setItem('ios-install-dismissed', 'true');
    setShowModal(false);
  };

  if (!showModal) {
    return null;
  }

  return (
    <div className="ios-install-modal">
      <div className="ios-install-modal__backdrop" onClick={handleDismiss} />
      <div className="ios-install-modal__content">
        <h2 className="ios-install-modal__title">Install Musicore</h2>
        <p className="ios-install-modal__description">
          Install this app on your iPad for the best experience:
        </p>
        <ol className="ios-install-modal__steps">
          <li>Tap the Share button <span className="ios-install-modal__icon" role="img" aria-label="Share icon">⎋</span> at the top</li>
          <li>Scroll down and tap "Add to Home Screen"</li>
          <li>Tap "Add" to confirm</li>
        </ol>
        <button 
          className="ios-install-modal__button" 
          onClick={handleDismiss}
          aria-label="Dismiss install instructions"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
