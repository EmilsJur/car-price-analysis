import React from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Link, 
  Divider, 
  useTheme,
  Paper,
  Grid
} from '@mui/material';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';

const Footer = () => {
  const theme = useTheme();
  const currentYear = new Date().getFullYear();
  
  return (
    <Paper 
      component="footer" 
      square 
      variant="outlined" 
      sx={{ 
        mt: 'auto',
        py: 3,
        backgroundColor: theme.palette.mode === 'light' 
          ? theme.palette.grey[100] 
          : theme.palette.grey[900],
        borderTop: `3px solid ${theme.palette.primary.main}` // Added border for visual interest
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={3} alignItems="center">
          {/* Logo and copyright */}
          <Grid item xs={12} sm={6}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mb: 1,
              pb: 1,
              borderBottom: `1px solid ${theme.palette.divider}`
            }}>
              <DirectionsCarIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
              <Typography variant="h6" component="div" fontWeight="bold" color="primary">
                Auto Tirgus Analīze
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              © {currentYear} Auto Tirgus Analīze. Izstrādāts kā kvalifikācijas darbs Rīgas Valsts tehnikumā.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Automašīnu dati tiek iegūti no SS.LV un analizēti, lai nodrošinātu aptuvenās tirgus cenas un tendences.
            </Typography>
          </Grid>
          
          {/* Contact */}
          <Grid item xs={12} sm={6}>
            <Box sx={{ 
              p: 2, 
              borderRadius: 2, 
              backgroundColor: theme.palette.mode === 'light' 
                ? 'rgba(25, 118, 210, 0.05)' 
                : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${theme.palette.divider}`
            }}>
              <Typography variant="subtitle1" gutterBottom fontWeight="medium" color="primary">
                Kontakti
              </Typography>
              <Box component="ul" sx={{ p: 0, m: 0, listStyle: 'none' }}>
                <Box component="li" sx={{ mb: 1 }}>
                  <Typography variant="body2">
                    E-pasts: info@autoanalytics.lv
                  </Typography>
                </Box>
                <Box component="li" sx={{ mb: 1 }}>
                  <Typography variant="body2">
                    Tālrunis: +371 12345678
                  </Typography>
                </Box>
                <Box component="li">
                  <Typography variant="body2">
                    Rīga, Latvija
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 3 }} />
        
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' }, 
          justifyContent: 'center', 
          alignItems: 'center', 
          gap: 2,
          '& a': {
            transition: 'color 0.2s ease',
            '&:hover': {
              color: theme.palette.primary.main
            }
          }
        }}>
          <Link href="/privacy" color="inherit" underline="hover">
            <Typography variant="body2" color="text.secondary">
              Privātuma Politika
            </Typography>
          </Link>
          <Link href="/terms" color="inherit" underline="hover">
            <Typography variant="body2" color="text.secondary">
              Lietošanas Noteikumi
            </Typography>
          </Link>
          <Link href="/sitemap" color="inherit" underline="hover">
            <Typography variant="body2" color="text.secondary">
              Vietnes Karte
            </Typography>
          </Link>
        </Box>
      </Container>
    </Paper>
  );
};

export default Footer;