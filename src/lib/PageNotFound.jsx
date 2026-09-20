import React from "react";
import { Link } from "react-router-dom";

export default function PageNotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <Link to="/" className="text-primary text-sm">
        Back to dashboard
      </Link>
    </div>
  );
}
