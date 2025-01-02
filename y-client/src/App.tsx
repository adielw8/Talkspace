import React, { useState } from 'react';
import axios from 'axios';
import {
  Box,
  Button,
  Alert,
  Paper,
  Select,
  MenuItem,
  IconButton
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

const App = () => {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [expireTime, setExpireTime] = useState<string>('5');
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5M

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);
    formData.append('expirationTime', expireTime);

    try {
      setLoading(true);
      const { data } = await axios.post('http://localhost:3000/v1/images', formData);
      setUrl(data.url);
      setFile(null);
      setError("")
    } catch (err) {
      setError('Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.size <= MAX_FILE_SIZE) {
      setFile(selectedFile);
      setError('');
      setUrl("");
    } else {
      setFile(null);
      setUrl("");
      setError('File too large (max 5MB)');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
  };

  return (
    <Box sx={{ maxWidth: 500, mx: 'auto', mt: 4 }}>
      <Paper sx={{ p: 2 }}>
        {/* File Upload */}
        <Button
          variant="outlined"
          component="label"
          fullWidth
        >
          {file ? file.name : 'Select Image'}
          <input
            type="file"
            hidden
            onChange={handleSelectImage}
            accept="image/*"
          />
        </Button>

        {/* Expiration Time */}
        <Select
          value={expireTime}
          onChange={(e) => setExpireTime(e.target.value)}
          fullWidth
          sx={{ mt: 2 }}
        >
          <MenuItem value="5">5 minutes</MenuItem>
          <MenuItem value="15">15 minutes</MenuItem>
          <MenuItem value="30">30 minutes</MenuItem>
          <MenuItem value="60">1 hour</MenuItem>
          <MenuItem value="1440">24 hours</MenuItem>
        </Select>

        {/* Upload Button */}
        <Button
          variant="contained"
          onClick={handleUpload}
          disabled={!file || loading}
          fullWidth
          sx={{ mt: 2 }}
        >
          {loading ? 'Uploading...' : 'Upload'}
        </Button>

        {/* Messages */}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {url && (
          <Alert 
            severity="success" 
            sx={{ mt: 2 }}
            action={
              <IconButton
                aria-label="copy"
                color="inherit"
                size="small"
                onClick={handleCopy}
              >
                <ContentCopyIcon />
              </IconButton>
            }
          >
            {url}
          </Alert>
        )}
      </Paper>
    </Box>
  );
};

export default App;