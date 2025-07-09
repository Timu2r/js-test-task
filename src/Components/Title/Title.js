import React from 'react';
import styled from 'styled-components';

const Header = styled.div`
    display: flex;
    align-items: center;
`;

const Logo = styled.div`
    width: ${props => props.$size || '32px'};
    height: ${props => props.$size || '32px'};
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 12px;
    font-weight: bold;
    color: white;
    font-size: ${props => `calc(${props.$size || '32px'} / 1.7)`};
`;

const TitleText = styled.h1`
    margin: 0;
    color: #111827;
    font-size: ${props => props.$fontSize || '20px'};
    font-weight: 600;
`;

export const Title = () => {
    return (
        <Header>
            <Logo $size="40px">G</Logo>
            <TitleText $fontSize="24px">Grensa.AI</TitleText>
        </Header>
    );
};