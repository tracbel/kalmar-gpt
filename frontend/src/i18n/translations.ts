export const translations = {
    pt: {
      letsTalk: "Vamos conversar?",
      subtitle: "Sou uma Inteligência Artificial desenvolvida pela Tracbel, especializada na marca Kalmar.",
      tipsButton: "Dicas KalmarGPT",
      newQuestionPlaceholder: "Digite uma nova pergunta...",
      stopGenerating: "Pare de gerar",
      generatingAnswer: "Gerando resposta...",
      tipsTitle: "FAQ - Como Usar Nosso Chatbot Corporativo",
      tips: [
        {
          q: "Como posso formular minhas perguntas para obter as melhores respostas?",
          a: "Use termos específicos que estão diretamente relacionados ao conteúdo em nossa base de dados."
        },
        {
          q: "O que devo fazer se o chatbot não entender minha pergunta?",
          a: `Tente reformular sua pergunta de forma mais clara e direta. Por exemplo, em vez de "Onde fica a Unidade da Kalmar?", pergunte "Qual é o endereço da sede da Kalmar?".`
        },
        {
          q: "Posso usar jargões ou termos genéricos nas minhas perguntas?",
          a: "É melhor evitar jargões ou termos genéricos. O chatbot pode não reconhecê-los. Use termos específicos que estão na base de dados."
        },
        {
          q: "Posso fazer perguntas complexas para o chatbot?",
          a: `Sim, mas é melhor estruturar sua pergunta em partes. Por exemplo, "Quero informações sobre: [Tipo de Equipamento], [Marca], [Localização]".`
        }
      ],
      disclaimer: "O KalmarGPT pode cometer erros. Por isso, é bom checar as respostas com nossos especialistas"
    },
    en: {
      letsTalk: "Shall we talk?",
      subtitle: "I am an AI developed by Tracbel, specialized in the Kalmar brand.",
      newQuestionPlaceholder: "Type a new question...",
      tipsButton: "KalmarGPT Tips",
      stopGenerating: "Stop generating",
      generatingAnswer: "Generating answer...",
      tipsTitle: "FAQ - How to Use Our Corporate Chatbot",
      tips: [
        {
          q: "How can I phrase my questions to get the best answers?",
          a: "Use specific terms that are directly related to the content in our database."
        },
        {
          q: "What should I do if the chatbot doesn't understand my question?",
          a: `Try to rephrase your question more clearly and directly. For example, instead of "Where is Kalmar's unit?", ask "What is the address of Kalmar's headquarters?".`
        },
        {
          q: "Can I use jargon or generic terms in my questions?",
          a: "It is better to avoid jargon or generic terms. The chatbot may not recognize them. Use specific terms present in the database."
        },
        {
          q: "Can I ask complex questions to the chatbot?",
          a: `Yes, but it's better to structure your question in parts. For example: "I want information about: [Equipment Type], [Brand], [Location]".`
        }
      ],
      disclaimer: "KalmarGPT can make mistakes. Therefore, it is advisable to verify the responses with our specialists"
    }
  };
  
  export type Language = keyof typeof translations;
  