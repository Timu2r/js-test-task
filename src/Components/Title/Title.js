import React from "react";
import styled from "styled-components";

const Header = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
`;

const Logo = styled.div`
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  font-weight: bold;
  color: white;
  font-size: 18px;
`;

const TitleText = styled.h1`
  margin: 0;
  color: #111827;
  font-size: 20px;
  font-weight: 600;
`;

export const Title = () => {
  return (
    <Header>
      <Logo>G</Logo>
      <TitleText>Grensa.AI</TitleText>
    </Header>
  );
};