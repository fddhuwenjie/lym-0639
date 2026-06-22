import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import ToastContainer from "@/components/Toast";
import Home from "@/pages/Home";
import BorrowBoard from "@/pages/BorrowBoard";
import DisinfectQueue from "@/pages/DisinfectQueue";
import DamageExport from "@/pages/DamageExport";

export default function App() {
  return (
    <Router>
      <ToastContainer />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/borrow" element={<BorrowBoard />} />
          <Route path="/disinfect" element={<DisinfectQueue />} />
          <Route path="/damage" element={<DamageExport />} />
        </Route>
      </Routes>
    </Router>
  );
}
