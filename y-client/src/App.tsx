import React, { useState } from 'react';
import axios from 'axios';
import {
  Box,
  Button,
  Alert,
  Paper
} from '@mui/material';

const App = () => {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<String>('');
  const [error, setError] = useState<String>('');
  const [loading, setLoading] = useState<Boolean>(false);
  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5M

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);
    formData.append('expirationTime', '5');

    try {
      setLoading(true);
      const { data } = await axios.post('http://localhost:3000/v1/images', formData);
      setUrl(data.url);
      setFile(null);
    } catch (err) {
      setError('Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectImage = (e)=> {
    const file = e.target.files?.[0];
    if (file && file.size <= MAX_FILE_SIZE ) {
      setFile(file);
      setError('');
      setUrl("")
    } else {
      setFile(null);
      setUrl("")
      setError('File too large (max 5MB)');
    }
  }

  return (
    <Box sx={{ maxWidth: 500, mx: 'auto', mt: 4 }}>
      <Paper sx={{ p: 2 }}>
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

        <Button
          variant="contained"
          onClick={handleUpload}
          disabled={!file || loading}
          fullWidth
          sx={{ mt: 2 }}
        >
          {loading ? 'Uploading...' : 'Upload'}
        </Button>

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {url && <Alert severity="success" sx={{ mt: 2 }}>{url}</Alert>}
      </Paper>
    </Box>
  );
};

export default App;