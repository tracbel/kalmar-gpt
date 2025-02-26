import { useRef, useState, useEffect, useContext, useLayoutEffect } from "react";
import { CommandBarButton, IconButton, Dialog, DialogType, Stack, Modal, IModalStyles, Spinner } from "@fluentui/react";
import { DismissRegular, SquareRegular, ShieldLockRegular, ErrorCircleRegular } from "@fluentui/react-icons";

import uuid from 'react-uuid';
import { isEmpty } from "lodash-es";

import styles from "./Chat.module.css";
import Mascote from "../../assets/mascote.png";
import Kalmar from "../../assets/kalmargpt.png";

import {
    ChatMessage,
    ConversationRequest,
    conversationApi,
    Citation,
    ToolMessageContent,
    ChatResponse,
    getUserInfo,
    Conversation,
    historyGenerate,
    historyUpdate,
    historyClear,
    ChatHistoryLoadingState,
    CosmosDBStatus,
    ErrorMessage
} from "../../api";
import { Answer } from "../../components/Answer";
import { QuestionInput } from "../../components/QuestionInput";
import { ChatHistoryPanel } from "../../components/ChatHistory/ChatHistoryPanel";
import { AppStateContext } from "../../state/AppProvider";
import { useBoolean } from "@fluentui/react-hooks";

const enum messageStatus {
    NotRunning = "Not Running",
    Processing = "Processing",
    Done = "Done"
}

const Chat = () => {
    // TODO: Modal citação
    const [showModal, setShowModal] = useState(false);
    const modalStyles: Partial<IModalStyles> = {
        main: {
          borderRadius: '8px',
        },
      };

    const openModal = () => {
      setShowModal(true);
    };
    
    const dismissModal = () => {
      setShowModal(false);
    };

    const appStateContext = useContext(AppStateContext)
    const chatMessageStreamEnd = useRef<HTMLDivElement | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [showLoadingMessage, setShowLoadingMessage] = useState<boolean>(false);
    const [activeCitation, setActiveCitation] = useState<Citation>();
    const [isCitationPanelOpen, setIsCitationPanelOpen] = useState<boolean>(false);
    const abortFuncs = useRef([] as AbortController[]);
    const [showAuthMessage, setShowAuthMessage] = useState<boolean>(true);
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [processMessages, setProcessMessages] = useState<messageStatus>(messageStatus.NotRunning);
    const [clearingChat, setClearingChat] = useState<boolean>(false);
    const [hideErrorDialog, { toggle: toggleErrorDialog }] = useBoolean(true);
    const [errorMsg, setErrorMsg] = useState<ErrorMessage | null>()

    const errorDialogContentProps = {
        type: DialogType.close,
        title: errorMsg?.title,
        closeButtonAriaLabel: 'Close',
        subText: errorMsg?.subtitle,
    };

    const modalProps = {
        titleAriaId: 'labelId',
        subtitleAriaId: 'subTextId',
        isBlocking: true,
        styles: { main: { maxWidth: 450 } },
    }

    const [ASSISTANT, TOOL, ERROR] = ["assistant", "tool", "error"]
    // Mobile
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    const handleResize = () => {
        setIsMobile(window.innerWidth < 768);
    };

    // Tooltip
    const [showIframeTooltip, setShowIframeTooltip] = useState(false);
    const handleMouseEnterIframe = () => setShowIframeTooltip(true);
    const handleMouseLeaveIframe = () => setShowIframeTooltip(false);
    

    useEffect(() => {
        if(appStateContext?.state.isCosmosDBAvailable?.status === CosmosDBStatus.NotWorking && appStateContext.state.chatHistoryLoadingState === ChatHistoryLoadingState.Fail && hideErrorDialog){
            let subtitle = `${appStateContext.state.isCosmosDBAvailable.status}. Entre em contato com o administrador do site.`
            setErrorMsg({
                title: "O histórico de bate-papo não está ativado",
                subtitle: subtitle
            })
            toggleErrorDialog();
        }
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [appStateContext?.state.isCosmosDBAvailable]);
    
    const handleErrorDialogClose = () => {
        toggleErrorDialog()
        setTimeout(() => {
            setErrorMsg(null)
        }, 500);
    }

    useEffect(() => {
       setIsLoading(appStateContext?.state.chatHistoryLoadingState === ChatHistoryLoadingState.Loading)
    }, [appStateContext?.state.chatHistoryLoadingState])

    // TODO: AUTENTICAÇÃo
    // const getUserInfoList = async () => {
    //     const userInfoList = await getUserInfo();
    //     if (userInfoList.length === 0 && window.location.hostname !== "127.0.0.1") {
    //         setShowAuthMessage(true);
    //     }
    //     else {
    //         setShowAuthMessage(false);
    //     }
    // }

    const getUserInfoList = async () => {
        setShowAuthMessage(false);
    }

    let assistantMessage = {} as ChatMessage
    let toolMessage = {} as ChatMessage
    let assistantContent = ""

    const processResultMessage = (resultMessage: ChatMessage, userMessage: ChatMessage, conversationId?: string) => {
        if (resultMessage.role === ASSISTANT) {
            assistantContent += resultMessage.content
            assistantMessage = resultMessage
            assistantMessage.content = assistantContent
        }

        if (resultMessage.role === TOOL) toolMessage = resultMessage

        if (!conversationId) {
            isEmpty(toolMessage) ?
                setMessages([...messages, userMessage, assistantMessage]) :
                setMessages([...messages, userMessage, toolMessage, assistantMessage]);
        } else {
            isEmpty(toolMessage) ?
                setMessages([...messages, assistantMessage]) :
                setMessages([...messages, toolMessage, assistantMessage]);
        }
    }

    const makeApiRequestWithoutCosmosDB = async (question: string, conversationId?: string) => {
        setIsLoading(true);
        setShowLoadingMessage(true);
        const abortController = new AbortController();
        abortFuncs.current.unshift(abortController);

        const userMessage: ChatMessage = {
            id: uuid(),
            role: "user",
            content: question,
            date: new Date().toISOString(),
        };

        let conversation: Conversation | null | undefined;
        if(!conversationId){
            conversation = {
                id: conversationId ?? uuid(),
                title: question,
                messages: [userMessage],
                date: new Date().toISOString(),
            }
        }else{
            conversation = appStateContext?.state?.currentChat
            if(!conversation){
                console.error("Conversa não encontrada.");
                setIsLoading(false);
                setShowLoadingMessage(false);
                abortFuncs.current = abortFuncs.current.filter(a => a !== abortController);
                return;
            }else{
                conversation.messages.push(userMessage);
            }
        }

        appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: conversation });
        setMessages(conversation.messages)
        
        const request: ConversationRequest = {
            messages: [...conversation.messages.filter((answer) => answer.role !== ERROR)]
        };

        let result = {} as ChatResponse;
        try {
            const response = await conversationApi(request, abortController.signal);
            if (response?.body) {
                const reader = response.body.getReader();
                let runningText = "";

                while (true) {
                    setProcessMessages(messageStatus.Processing)
                    const {done, value} = await reader.read();
                    if (done) break;

                    var text = new TextDecoder("utf-8").decode(value);
                    const objects = text.split("\n");
                    objects.forEach((obj) => {
                        try {
                            runningText += obj;
                            result = JSON.parse(runningText);
                            result.choices[0].messages.forEach((obj) => {
                                obj.id = uuid();
                                obj.date = new Date().toISOString();
                            })
                            setShowLoadingMessage(false);
                            result.choices[0].messages.forEach((resultObj) => {
                                processResultMessage(resultObj, userMessage, conversationId);
                            })
                            runningText = "";
                        }
                        catch { }
                    });
                }
                conversation.messages.push(toolMessage, assistantMessage)
                appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: conversation });
                setMessages([...messages, toolMessage, assistantMessage]);
            }
            
        } catch ( e )  {
            if (!abortController.signal.aborted) {
                let errorMessage = "Um erro ocorreu. Por favor, tente novamente. Se o problema persistir, entre em contato com o administrador do site.";
                if (result.error?.message) {
                    errorMessage = result.error.message;
                }
                else if (typeof result.error === "string") {
                    errorMessage = result.error;
                }
                let errorChatMsg: ChatMessage = {
                    id: uuid(),
                    role: ERROR,
                    content: errorMessage,
                    date: new Date().toISOString()
                }
                conversation.messages.push(errorChatMsg);
                appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: conversation });
                setMessages([...messages, errorChatMsg]);
            } else {
                setMessages([...messages, userMessage])
            }
        } finally {
            setIsLoading(false);
            setShowLoadingMessage(false);
            abortFuncs.current = abortFuncs.current.filter(a => a !== abortController);
            setProcessMessages(messageStatus.Done)
        }

        return abortController.abort();
    };

    const makeApiRequestWithCosmosDB = async (question: string, conversationId?: string) => {
        setIsLoading(true);
        setShowLoadingMessage(true);
        const abortController = new AbortController();
        abortFuncs.current.unshift(abortController);

        const userMessage: ChatMessage = {
            id: uuid(),
            role: "user",
            content: question,
            date: new Date().toISOString(),
        };

        //api call params set here (generate)
        let request: ConversationRequest;
        let conversation;
        if(conversationId){
            conversation = appStateContext?.state?.chatHistory?.find((conv) => conv.id === conversationId)
            if(!conversation){
                console.error("Conversa não encontrada.");
                setIsLoading(false);
                setShowLoadingMessage(false);
                abortFuncs.current = abortFuncs.current.filter(a => a !== abortController);
                return;
            }else{
                conversation.messages.push(userMessage);
                request = {
                    messages: [...conversation.messages.filter((answer) => answer.role !== ERROR)]
                };
            }
        }else{
            request = {
                messages: [userMessage].filter((answer) => answer.role !== ERROR)
            };
            setMessages(request.messages)
        }
        let result = {} as ChatResponse;
        try {
            const response = conversationId ? await historyGenerate(request, abortController.signal, conversationId) : await historyGenerate(request, abortController.signal);
            if(!response?.ok){
                let errorChatMsg: ChatMessage = {
                    id: uuid(),
                    role: ERROR,
                    content: "Ocorreu um erro ao gerar uma resposta. O histórico de bate-papo não pode ser salvo neste momento. Se o problema persistir, entre em contato com o administrador do site.",
                    date: new Date().toISOString()
                }
                let resultConversation;
                if(conversationId){
                    resultConversation = appStateContext?.state?.chatHistory?.find((conv) => conv.id === conversationId)
                    if(!resultConversation){
                        console.error("Conversa não encontrada.");
                        setIsLoading(false);
                        setShowLoadingMessage(false);
                        abortFuncs.current = abortFuncs.current.filter(a => a !== abortController);
                        return;
                    }
                    resultConversation.messages.push(errorChatMsg);
                }else{
                    setMessages([...messages, userMessage, errorChatMsg])
                    setIsLoading(false);
                    setShowLoadingMessage(false);
                    abortFuncs.current = abortFuncs.current.filter(a => a !== abortController);
                    return;
                }
                appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: resultConversation });
                setMessages([...resultConversation.messages]);
                return;
            }
            if (response?.body) {
                const reader = response.body.getReader();
                let runningText = "";

                while (true) {
                    setProcessMessages(messageStatus.Processing)
                    const {done, value} = await reader.read();
                    if (done) break;

                    var text = new TextDecoder("utf-8").decode(value);
                    const objects = text.split("\n");
                    objects.forEach((obj) => {
                        try {
                            runningText += obj;
                            result = JSON.parse(runningText);
                            result.choices[0].messages.forEach((obj) => {
                                obj.id = uuid();
                                obj.date = new Date().toISOString();
                            })
                            setShowLoadingMessage(false);
                            result.choices[0].messages.forEach((resultObj) => {
                                processResultMessage(resultObj, userMessage, conversationId);
                            })
                            runningText = "";
                        }
                        catch { }
                    });
                }

                let resultConversation;
                if(conversationId){
                    resultConversation = appStateContext?.state?.chatHistory?.find((conv) => conv.id === conversationId)
                    if(!resultConversation){
                        console.error("Conversa não encontrada.");
                        setIsLoading(false);
                        setShowLoadingMessage(false);
                        abortFuncs.current = abortFuncs.current.filter(a => a !== abortController);
                        return;
                    }
                    isEmpty(toolMessage) ?
                        resultConversation.messages.push(assistantMessage) :
                        resultConversation.messages.push(toolMessage, assistantMessage)
                }else{
                    resultConversation = {
                        id: result.history_metadata.conversation_id,
                        title: result.history_metadata.title,
                        messages: [userMessage],
                        date: result.history_metadata.date
                    }
                    isEmpty(toolMessage) ?
                        resultConversation.messages.push(assistantMessage) :
                        resultConversation.messages.push(toolMessage, assistantMessage)
                }
                if(!resultConversation){
                    setIsLoading(false);
                    setShowLoadingMessage(false);
                    abortFuncs.current = abortFuncs.current.filter(a => a !== abortController);
                    return;
                }
                appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: resultConversation });
                isEmpty(toolMessage) ?
                    setMessages([...messages, assistantMessage]) :
                    setMessages([...messages, toolMessage, assistantMessage]);     
            }
            
        } catch ( e )  {
            if (!abortController.signal.aborted) {
                let errorMessage = "Um erro ocorreu. Por favor, tente novamente. Se o problema persistir, entre em contato com o administrador do site.";
                if (result.error?.message) {
                    errorMessage = result.error.message;
                }
                else if (typeof result.error === "string") {
                    errorMessage = result.error;
                }
                let errorChatMsg: ChatMessage = {
                    id: uuid(),
                    role: ERROR,
                    content: errorMessage,
                    date: new Date().toISOString()
                }
                let resultConversation;
                if(conversationId){
                    resultConversation = appStateContext?.state?.chatHistory?.find((conv) => conv.id === conversationId)
                    if(!resultConversation){
                        console.error("Conversa não encontrada.");
                        setIsLoading(false);
                        setShowLoadingMessage(false);
                        abortFuncs.current = abortFuncs.current.filter(a => a !== abortController);
                        return;
                    }
                    resultConversation.messages.push(errorChatMsg);
                }else{
                    if(!result.history_metadata){
                        console.error("Error retrieving data.", result);
                        setIsLoading(false);
                        setShowLoadingMessage(false);
                        abortFuncs.current = abortFuncs.current.filter(a => a !== abortController);
                        return;
                    }
                    resultConversation = {
                        id: result.history_metadata.conversation_id,
                        title: result.history_metadata.title,
                        messages: [userMessage],
                        date: result.history_metadata.date
                    }
                    resultConversation.messages.push(errorChatMsg);
                }
                if(!resultConversation){
                    setIsLoading(false);
                    setShowLoadingMessage(false);
                    abortFuncs.current = abortFuncs.current.filter(a => a !== abortController);
                    return;
                }
                appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: resultConversation });
                setMessages([...messages, errorChatMsg]);
            } else {
                setMessages([...messages, userMessage])
            }
        } finally {
            setIsLoading(false);
            setShowLoadingMessage(false);
            abortFuncs.current = abortFuncs.current.filter(a => a !== abortController);
            setProcessMessages(messageStatus.Done)
        }
        return abortController.abort();

    }

    const clearChat = async () => {
        setClearingChat(true)
        if(appStateContext?.state.currentChat?.id && appStateContext?.state.isCosmosDBAvailable.cosmosDB){
            let response = await historyClear(appStateContext?.state.currentChat.id)
            if(!response.ok){
                setErrorMsg({
                    title: "Erro ao limpar o chat atual",
                    subtitle: "Por favor, tente novamente. Se o problema persistir, entre em contato com o administrador do site.",
                })
                toggleErrorDialog();
            }else{
                appStateContext?.dispatch({ type: 'DELETE_CURRENT_CHAT_MESSAGES', payload: appStateContext?.state.currentChat.id});
                appStateContext?.dispatch({ type: 'UPDATE_CHAT_HISTORY', payload: appStateContext?.state.currentChat});
                setActiveCitation(undefined);
                setIsCitationPanelOpen(false);
                setMessages([])
            }
        }
        setClearingChat(false)
    };

    const newChat = () => {
        setProcessMessages(messageStatus.Processing)
        setMessages([])
        setIsCitationPanelOpen(false);
        setActiveCitation(undefined);
        appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: null });
        setProcessMessages(messageStatus.Done)
    };

    const stopGenerating = () => {
        abortFuncs.current.forEach(a => a.abort());
        setShowLoadingMessage(false);
        setIsLoading(false);
    }

    useEffect(() => {
        if (appStateContext?.state.currentChat) {
            setMessages(appStateContext.state.currentChat.messages)
        }else{
            setMessages([])
        }
    }, [appStateContext?.state.currentChat]);
    
    useLayoutEffect(() => {
        const saveToDB = async (messages: ChatMessage[], id: string) => {
            const response = await historyUpdate(messages, id)
            return response
        }

        if (appStateContext && appStateContext.state.currentChat && processMessages === messageStatus.Done) {
                if(appStateContext.state.isCosmosDBAvailable.cosmosDB){
                    if(!appStateContext?.state.currentChat?.messages){
                        console.error("Falha ao buscar o estado atual do chat.")
                        return 
                    }
                    saveToDB(appStateContext.state.currentChat.messages, appStateContext.state.currentChat.id)
                    .then((res) => {
                        if(!res.ok){
                            let errorMessage = "Um erro ocorreu. As respostas não podem ser salvas neste momento. Se o problema persistir, entre em contato com o administrador do site.";
                            let errorChatMsg: ChatMessage = {
                                id: uuid(),
                                role: ERROR,
                                content: errorMessage,
                                date: new Date().toISOString()
                            }
                            if(!appStateContext?.state.currentChat?.messages){
                                let err: Error = {
                                    ...new Error,
                                    message: "Falha ao buscar o estado atual do chat."
                                }
                                throw err
                            }
                            setMessages([...appStateContext?.state.currentChat?.messages, errorChatMsg])
                        }
                        return res as Response
                    })
                    .catch((err) => {
                        console.error("Error: ", err)
                        let errRes: Response = {
                            ...new Response,
                            ok: false,
                            status: 500,
                        }
                        return errRes;
                    })
                }else{
                }
                appStateContext?.dispatch({ type: 'UPDATE_CHAT_HISTORY', payload: appStateContext.state.currentChat });
                setMessages(appStateContext.state.currentChat.messages)
            setProcessMessages(messageStatus.NotRunning)
        }
    }, [processMessages]);

    useEffect(() => {
        getUserInfoList();
    }, []);

    useLayoutEffect(() => {
        chatMessageStreamEnd.current?.scrollIntoView({ behavior: "smooth" })
    }, [showLoadingMessage, processMessages]);

    // const onShowCitation = (citation: Citation) => {
    //     setActiveCitation(citation);
    //     setIsCitationPanelOpen(true);
    // };

    // const onViewSource = (citation: Citation) => {
    //     if (citation.url && !citation.url.includes("blob.core")) {
    //         window.open(citation.url, "_blank");
    //     }
    // };

    const parseCitationFromMessage = (message: ChatMessage) => {
        if (message?.role && message?.role === "tool") {
            try {
                const toolMessage = JSON.parse(message.content) as ToolMessageContent;
                return toolMessage.citations;
            }
            catch {
                return [];
            }
        }
        return [];
    }

    const disabledButton = () => {
        return isLoading || (messages && messages.length === 0) || clearingChat || appStateContext?.state.chatHistoryLoadingState === ChatHistoryLoadingState.Loading
    }

    return (
        <div className={styles.container} role="main">
            {/* TODO:Ajustar condicional */}
            {showAuthMessage ? (
                <Stack className={styles.chatEmptyState}>
                    <ShieldLockRegular className={styles.chatIcon} style={{color: 'darkorange', height: "200px", width: "200px"}}/>
                    <h1 className={styles.chatEmptyStateTitle}>Authentication Not Configured</h1>
                    <h2 className={styles.chatEmptyStateSubtitle}>
                        This app does not have authentication configured. Please add an identity provider by finding your app in the 
                        <a href="https://portal.azure.com/" target="_blank"> Azure Portal </a>
                        and following 
                         <a href="https://learn.microsoft.com/en-us/azure/app-service/scenario-secure-app-authentication-app-service#3-configure-authentication-and-authorization" target="_blank"> these instructions</a>.
                    </h2>
                    <h2 className={styles.chatEmptyStateSubtitle} style={{fontSize: "20px"}}><strong>Authentication configuration takes a few minutes to apply. </strong></h2>
                    <h2 className={styles.chatEmptyStateSubtitle} style={{fontSize: "20px"}}><strong>If you deployed in the last 10 minutes, please wait and reload the page after 10 minutes.</strong></h2>
                </Stack>
            ) : (
                <Stack horizontal className={styles.chatRoot}>
                    <div className={!messages || messages.length < 1 ? (styles.chatContainerBg):(styles.chatContainerBg)}>
                        {!messages || messages.length < 1 ? (
                            // <Stack className={styles.chatEmptyState}>
                            //     <img
                            //         src={Mascote}
                            //         className={styles.chatIcon}
                            //         aria-hidden="true"
                            //     />
                            //     <h1 className={styles.chatEmptyStateTitle}>Vamos conversar?</h1>
                            //     <h2 className={styles.chatEmptyStateSubtitle}>O TracGPT foi treinado para fornecer informações sobre o Grupo Tracbel.</h2>
                            // </Stack>
                            // <Stack className={styles.chatEmptyState}>
                            //     <iframe
                            //         src="https://studiowox.com/projetos/tracbel/"
                            //         style={{ width: "100%", height: "380px", border: "none", margin: "0 0 -30px 0"}}
                            //         title="Conteúdo Tracbel"
                            //     />
                            //     <h1 className={styles.chatEmptyStateTitle}>Vamos conversar?</h1>
                            //     <h2 className={styles.chatEmptyStateSubtitle}>O KalmarGPT foi treinado para fornecer informações sobre as melhores Retroescavadeira do mercado.</h2>
                            // </Stack>
                            <Stack className={styles.chatEmptyState} onMouseEnter={handleMouseEnterIframe} onMouseLeave={handleMouseLeaveIframe}>
                               
                                {/* <iframe
                                    src="https://studiowox.com/projetos/tracbel/"
                                    style={{ width: "100%", height: "380px", border: "none", margin: "0 0 -30px 0"}}
                                    title="Conteúdo Tracbel"
                                />   */}
                                {/* {showIframeTooltip &&  !isMobile && <div className={styles.tooltip}><p><b>•</b> Clique com o botão esquerdo sobre a imagem e gire para interagir.</p><p><b>•</b> Mova o scroll do mouse sobre a imagem mudar o zoom.</p>
                                </div>}
                                {!showIframeTooltip && <p className={styles.stackText}><i>Clique na Retroescavadeira Kalmar e gire para conhecer o melhor equipamento.</i></p>}
                                {showIframeTooltip && <p className={styles.stackText2}><i>.</i></p>} */}
                                <img
                                    src={Kalmar}
                                    className={styles.kalmargpt}
                                    aria-hidden="true"
                                />
                                <img
                                    src={Mascote}
                                    className={styles.chatIcon}
                                    aria-hidden="true"
                                /> 
                                <h1 className={styles.chatEmptyStateTitle}>Vamos conversar?</h1>
                                <h2 className={styles.chatEmptyStateSubtitle}>Sou uma Inteligência Artificial desenvolvida pela Tracbel, especializada na marca Kalmar.</h2>
                            </Stack>

                        ) : (
                            <div className={styles.chatMessageStream} style={{ marginBottom: isLoading ? "40px" : "0px"}} role="log">
                                {messages.map((answer, index) => (
                                    <>
                                        {answer.role === "user" ? (
                                            <div className={styles.chatMessageUser} tabIndex={0}>
                                                <div className={styles.chatMessageUserMessage}>{answer.content}</div>
                                            </div>
                                        ) : (
                                            answer.role === "assistant" ? <div className={styles.chatMessageGpt}>
                                                <Answer
                                                    answer={{
                                                        answer: answer.content,
                                                        citations: parseCitationFromMessage(messages[index - 1]),
                                                    }}
                                                />
                                            </div> : answer.role === ERROR ? <div className={styles.chatMessageError}>
                                                <Stack horizontal className={styles.chatMessageErrorContent}>
                                                    <ErrorCircleRegular className={styles.errorIcon} style={{color: "rgba(182, 52, 67, 1)"}} />
                                                    <span>Error</span>
                                                </Stack>
                                                <span className={styles.chatMessageErrorContent}>{answer.content}</span>
                                            </div> : null
                                        )}
                                    </>
                                ))}
                                {showLoadingMessage && (
                                    
                                        <div className={styles.chatMessageGpt}>
                                            {/* <Answer
                                                answer={{
                                                    answer: "Gerando resposta...",
                                                    citations: []
                                                }}/> */}
                                                <Spinner label="Gerando resposta..." />
                                        </div>

                                )}
                                <div ref={chatMessageStreamEnd} />
                            </div>
                        )}



                        <Stack horizontal className={isMobile ? styles.chatInputMobile : styles.chatInput}>
                            {isLoading && (
                                <Stack 
                                    horizontal
                                    className={styles.stopGeneratingContainer}
                                    role="button"
                                    aria-label="Pare de gerar"
                                    tabIndex={0}
                                    onClick={stopGenerating}
                                    onKeyDown={e => e.key === "Enter" || e.key === " " ? stopGenerating() : null}
                                    >
                                        <SquareRegular className={styles.stopGeneratingIcon} aria-hidden="true"/>
                                        <span className={styles.stopGeneratingText} aria-hidden="true">Pare de gerar</span>
                                </Stack>
                            )}
                            {/* TODO: Btn chat */}
                            <Stack>

                            <CommandBarButton
                                role="button"
                                styles={{ 
                                    icon: { 
                                        color: '#FFFFFF',
                                    },
                                    iconHovered: { 
                                        color: '#FFFFFF', 
                                    },
                                    root: {
                                        color: '#FFFFFF',
                                        background: "radial-gradient(109.81% 107.82% at 100.1% 90.19%, #fbbb00 33.63%, #fac937 70.31%, #f7cd4f 100%)"
                                    },
                                    rootHovered: {
                                        background: "#E29682 ", 
                                    },
                                    rootDisabled: {
                                        background: "#0000"
                                        // background: "#BDBDBD"
                                    }
                                }}
                                className={appStateContext?.state.isCosmosDBAvailable?.status !== CosmosDBStatus.NotConfigured ? styles.newChatIcon : styles.newChatIcon}
                                iconProps={{ iconName: 'Delete' }}
                                onClick={appStateContext?.state.isCosmosDBAvailable?.status !== CosmosDBStatus.NotConfigured ? clearChat : newChat}
                                disabled={disabledButton()}
                                aria-label="botão limpar bate-papo"
                            />
                               
                                <Dialog
                                    hidden={hideErrorDialog}
                                    onDismiss={handleErrorDialogClose}
                                    dialogContentProps={errorDialogContentProps}
                                    modalProps={modalProps}
                                >
                                </Dialog>
                            </Stack>
                            <QuestionInput
                                clearOnSend
                                placeholder="Digite uma nova pergunta..."
                                disabled={isLoading}
                                onSend={(question, id) => {
                                    appStateContext?.state.isCosmosDBAvailable?.cosmosDB ? makeApiRequestWithCosmosDB(question, id) : makeApiRequestWithoutCosmosDB(question, id)
                                }}
                                conversationId={appStateContext?.state.currentChat?.id ? appStateContext?.state.currentChat?.id : undefined}
                            />
                        </Stack>
                    </div>
                {(appStateContext?.state.isChatHistoryOpen && appStateContext?.state.isCosmosDBAvailable?.status !== CosmosDBStatus.NotConfigured) && <ChatHistoryPanel/>}
                </Stack>
            )}
        </div>
    );
};

export default Chat;
