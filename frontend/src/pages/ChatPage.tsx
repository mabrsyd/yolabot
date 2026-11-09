import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { useAuthStore } from '../stores/auth-store';
import { useChatStore } from '../stores/chat-store';

export const ChatPage: React.FC = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { selectConversation, activeConversationId } = useChatStore();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (conversationId && conversationId !== activeConversationId) {
      void selectConversation(conversationId);
    }
  }, [conversationId, activeConversationId, selectConversation]);

  if (!isAuthenticated) return null;

  return <MainLayout />;
};
