import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import ko from './locales/ko';

// 브라우저 언어 감지
const getBrowserLanguage = (): string => {
  const browserLang = navigator.language.split('-')[0];
  return ['ko', 'en'].includes(browserLang) ? browserLang : 'en';
};

// localStorage에서 저장된 언어 가져오기
const getSavedLanguage = (): string => {
  return localStorage.getItem('language') || getBrowserLanguage();
};

i18n.use(initReactI18next).init({
  resources: {
    en,
    ko,
  },
  lng: getSavedLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, // React는 XSS를 자동으로 방어
  },
});

export default i18n;
