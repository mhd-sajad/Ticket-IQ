/* ──────────────────────────────────────────
   TicketIQ — App entry
   ────────────────────────────────────────── */
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './lib/ThemeContext';
import Layout from './components/Layout';
import TriagePage from './pages/TriagePage';
import LiveStreamPage from './pages/LiveStreamPage';
import InsightsPage from './pages/InsightsPage';
import ModelLabPage from './pages/ModelLabPage';
import ReviewQueuePage from './pages/ReviewQueuePage';
import AboutPage from './pages/AboutPage';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<TriagePage />} />
            <Route path="live" element={<LiveStreamPage />} />
            <Route path="insights" element={<InsightsPage />} />
            <Route path="models" element={<ModelLabPage />} />
            <Route path="review" element={<ReviewQueuePage />} />
            <Route path="about" element={<AboutPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
