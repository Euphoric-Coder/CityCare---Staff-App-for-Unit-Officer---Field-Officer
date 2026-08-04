import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type RootErrorBoundaryProps = React.PropsWithChildren;

type RootErrorBoundaryState = {
  hasError: boolean;
};

export default class RootErrorBoundary extends React.Component<
  RootErrorBoundaryProps,
  RootErrorBoundaryState
> {
  state: RootErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): RootErrorBoundaryState {
    return {
      hasError: true,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ROOT_RENDER_ERROR', error, errorInfo);
  }

  private handleRetry = (): void => {
    this.setState({
      hasError: false,
    });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <SafeAreaView
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            backgroundColor: '#F0FDFA',
          }}>
          <Text
            style={{
              fontSize: 22,
              fontWeight: '800',
              color: '#991B1B',
              textAlign: 'center',
            }}>
            CityCare could not load this screen
          </Text>

          <Text
            style={{
              marginTop: 10,
              fontSize: 15,
              color: '#475569',
              textAlign: 'center',
              lineHeight: 22,
            }}>
            An unexpected interface error occurred. Check the development console for more details.
          </Text>

          <TouchableOpacity
            onPress={this.handleRetry}
            style={{
              marginTop: 20,
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 10,
              backgroundColor: '#0D9488',
            }}>
            <Text
              style={{
                color: '#FFFFFF',
                fontWeight: '700',
              }}>
              Try Again
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}
