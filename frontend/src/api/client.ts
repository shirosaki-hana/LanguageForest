import axios from 'axios';

// Axios 인스턴스 생성
export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true, // 쿠키를 포함하여 요청
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터 (필요시 토큰 추가 등)
apiClient.interceptors.request.use(
  config => {
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 (에러 처리)
apiClient.interceptors.response.use(
  response => response,
  error => {
    // 401 에러 시 인증 상태 초기화는 스토어에서 처리
    return Promise.reject(error);
  }
);
