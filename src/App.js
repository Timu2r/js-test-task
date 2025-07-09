import React from "react";
import styled from "styled-components";
import { Title } from "./Components/Title/Title";
import { Summary } from "./Components/Summary/Summary";

const AppContainer = styled.div`
  width: min(400px, 90vw); 
  height: auto;
  max-height: min(500px, 90vh); 
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 
    0 4px 6px rgba(0, 0, 0, 0.05),
    0 10px 25px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, 
    "Helvetica Neue", Arial, sans-serif;
  overflow-y: auto;
  color: #111827;
  line-height: 1.5;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: #e5e7eb;
    border-radius: 4px;
  }
  
  &:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }
  
  @media (max-width: 480px) {
    border-radius: 8px;
    padding: 1.25rem;
  }
`;

export const App = () => {
  return (
    <AppContainer>
      <Title />
      <Summary />
    </AppContainer>
  );
};