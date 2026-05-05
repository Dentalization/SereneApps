import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from 'components/ui/Button';
import Icon from 'components/AppIcon';
import { useLanguage } from '../contexts/LanguageContext';

const NotFound = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoBack = () => {
    // Check if there's history to go back to
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // Fallback to home if no history
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <h1 className="text-9xl font-bold text-primary opacity-20">404</h1>
          </div>
        </div>

        <h2 className="text-2xl font-medium text-onBackground mb-2">{t('common.pageNotFound', { defaultValue: 'Page Not Found' })}</h2>
        <p className="text-onBackground/70 mb-8">
          {t('common.pageNotFoundDescription', { defaultValue: "The page you're looking for does not exist. Let us get you back." })}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            variant="primary"
            icon={<Icon name="ArrowLeft" />}
            iconPosition="left"
            onClick={handleGoBack}
          >
            {t('common.goBack', { defaultValue: 'Go Back' })}
          </Button>

          <Button
            variant="outline"
            icon={<Icon name="Home" />}
            iconPosition="left"
            onClick={handleGoHome}
          >
            {t('common.backToHome', { defaultValue: 'Back to Home' })}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
