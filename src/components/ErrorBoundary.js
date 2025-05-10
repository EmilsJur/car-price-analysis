import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '100vh',
          p: 3
        }}>
          <Paper elevation={3} sx={{ p: 4, maxWidth: 600, textAlign: 'center' }}>
            <ErrorOutlineIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Notika kļūda
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Atvainojamies par neērtībām. Lūdzu, atsvaidziniet lapu vai mēģiniet vēlāk.
            </Typography>
            <Button 
              variant="contained" 
              onClick={this.handleReset}
              color="primary"
            >
              Atsvaidzināt lapu
            </Button>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;