import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Send, Paperclip, Image as ImageIcon, ArrowLeft } from 'lucide-react-native';

interface Message {
  id: string;
  sender_name: string;
  sender_role: string;
  message: string;
  created_at: string;
  status: string;
}

interface MessagingInterfaceProps {
  issueId: string;
  issueTitle: string;
  messages: Message[];
  currentUserRole: string;
  onSendMessage: (message: string) => void;
  onBack: () => void;
}

export default function MessagingInterface({
  issueId,
  issueTitle,
  messages,
  currentUserRole,
  onSendMessage,
  onBack,
}: MessagingInterfaceProps) {
  const [messageText, setMessageText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const handleSend = () => {
    if (messageText.trim()) {
      onSendMessage(messageText.trim());
      setMessageText('');
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOfficer = item.sender_role === 'Unit Officer' || item.sender_role === 'Field Officer';
    const isCurrentUser = item.sender_role === currentUserRole;

    return (
      <View style={[styles.messageContainer, isCurrentUser && styles.messageContainerRight]}>
        <View
          style={[styles.messageBubble, isOfficer ? styles.officerBubble : styles.citizenBubble]}>
          <View style={styles.messageHeader}>
            <Text style={[styles.senderName, isOfficer ? styles.officerText : styles.citizenText]}>
              {item.sender_name}
            </Text>
            <Text style={styles.senderRole}>{item.sender_role}</Text>
          </View>
          <Text style={styles.messageText}>{item.message}</Text>
          <View style={styles.messageFooter}>
            <Text style={styles.timestamp}>
              {new Date(item.created_at).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            {isCurrentUser && <Text style={styles.status}>{item.status}</Text>}
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}>
          <ArrowLeft color="#FFFFFF" size={24} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Issue #{issueId.slice(0, 8)}</Text>
          <Text style={styles.headerSubtitle}>{issueTitle}</Text>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No messages yet. Start the conversation!</Text>
          </View>
        }
      />

      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.attachButton} activeOpacity={0.7}>
          <Paperclip color="#6B7280" size={22} strokeWidth={2} />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#9CA3AF"
          value={messageText}
          onChangeText={setMessageText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!messageText.trim()}
          activeOpacity={0.7}>
          <Send color="#FFFFFF" size={20} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#0EA5A4',
    gap: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#CCFBF1',
    fontWeight: '500',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  messageContainerRight: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  officerBubble: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderBottomRightRadius: 4,
  },
  citizenBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderBottomLeftRadius: 4,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  senderName: {
    fontSize: 14,
    fontWeight: '700',
  },
  officerText: {
    color: '#0F766E',
  },
  citizenText: {
    color: '#4B5563',
  },
  senderRole: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  messageText: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 21,
    marginBottom: 6,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timestamp: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  status: {
    fontSize: 10,
    color: '#0EA5A4',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 10,
  },
  attachButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 22,
  },
  input: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    maxHeight: 100,
    fontWeight: '500',
  },
  sendButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0EA5A4',
    borderRadius: 22,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
