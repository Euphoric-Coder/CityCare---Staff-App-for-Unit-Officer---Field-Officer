import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, MessageSquare, Send } from 'lucide-react-native';
import { mockConversations, mockMessages } from '../lib/mockData';
import StatusBadge from './ui/StatusBadge';

export default function MessagesTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');

  const filteredConversations = mockConversations.filter(
    (conv) =>
      conv.issueTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.issueId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const conversationMessages = selectedConversation
    ? mockMessages.filter((msg) => msg.issueId === selectedConversation)
    : [];

  const selectedConvData = mockConversations.find((conv) => conv.issueId === selectedConversation);

  const handleSendMessage = () => {
    if (messageText.trim()) {
      setMessageText('');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#0EA5A4', '#0F766E']} style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <Text style={styles.headerSubtitle}>Communication with field officers</Text>
      </LinearGradient>

      {!selectedConversation ? (
        <View style={styles.content}>
          <View style={styles.searchBar}>
            <Search size={20} color="#64748B" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search conversations..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#94A3B8"
            />
          </View>

          <ScrollView style={styles.conversationList} showsVerticalScrollIndicator={false}>
            {filteredConversations.map((conversation) => (
              <TouchableOpacity
                key={conversation.issueId}
                style={styles.conversationCard}
                onPress={() => setSelectedConversation(conversation.issueId)}
                activeOpacity={0.7}>
                <View style={styles.conversationHeader}>
                  <Text style={styles.issueId}>{conversation.issueId}</Text>
                  <StatusBadge status={conversation.status} size="small" />
                </View>

                <Text style={styles.conversationTitle} numberOfLines={2}>
                  {conversation.issueTitle}
                </Text>

                <Text style={styles.lastMessage} numberOfLines={1}>
                  {conversation.lastMessage}
                </Text>

                <View style={styles.conversationFooter}>
                  <Text style={styles.timestamp}>
                    {new Date(conversation.lastMessageTime).toLocaleString()}
                  </Text>
                  {conversation.unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadCount}>{conversation.unreadCount}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}

            {filteredConversations.length === 0 && (
              <View style={styles.emptyState}>
                <MessageSquare size={64} color="#CBD5E1" strokeWidth={1.5} />
                <Text style={styles.emptyText}>No conversations found</Text>
              </View>
            )}
          </ScrollView>
        </View>
      ) : (
        <View style={styles.chatContainer}>
          <View style={styles.chatHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setSelectedConversation(null)}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <View>
              <Text style={styles.chatTitle}>{selectedConvData?.issueTitle}</Text>
              <Text style={styles.chatId}>{selectedConvData?.issueId}</Text>
            </View>
          </View>

          <ScrollView style={styles.messagesList} contentContainerStyle={styles.messagesContent}>
            {conversationMessages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageCard,
                  message.fromRole === 'UnitOfficer' && styles.messageCardOwn,
                ]}>
                <Text style={styles.messageSender}>{message.fromUserName}</Text>
                <Text style={styles.messageText}>{message.text}</Text>
                <Text style={styles.messageTime}>
                  {new Date(message.timestamp).toLocaleTimeString()}
                </Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.messageInput}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              value={messageText}
              onChangeText={setMessageText}
              placeholderTextColor="#94A3B8"
              multiline
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSendMessage}
              disabled={!messageText.trim()}
              activeOpacity={0.7}>
              <Send size={20} color={messageText.trim() ? '#0EA5A4' : '#CBD5E1'} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FDFA',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#CCFBF1',
  },
  content: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
  },
  conversationList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  conversationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0F2F1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  issueId: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0EA5A4',
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  lastMessage: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 12,
    color: '#94A3B8',
  },
  unreadBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#94A3B8',
    marginTop: 16,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  chatHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    marginBottom: 8,
  },
  backText: {
    fontSize: 14,
    color: '#0EA5A4',
    fontWeight: '600',
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  chatId: {
    fontSize: 13,
    color: '#64748B',
  },
  messagesList: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  messagesContent: {
    padding: 16,
  },
  messageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    maxWidth: '80%',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  messageCardOwn: {
    alignSelf: 'flex-end',
    backgroundColor: '#E0F2F1',
    borderColor: '#B2DFDB',
  },
  messageSender: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0EA5A4',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#0F172A',
    lineHeight: 20,
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 11,
    color: '#94A3B8',
  },
  messageInput: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0F2F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
