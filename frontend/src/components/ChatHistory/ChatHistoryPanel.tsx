import { CommandBarButton, ContextualMenu, DefaultButton, Dialog, DialogFooter, DialogType, ICommandBarStyles, IContextualMenuItem, IStackStyles, PrimaryButton, Spinner, SpinnerSize, Stack, StackItem, Text } from "@fluentui/react";
import { useBoolean } from '@fluentui/react-hooks';
import { FaTimes, FaEllipsisV, FaTrash, FaRegLightbulb  } from "react-icons/fa"; // Ícones substituídos

import styles from "./ChatHistoryPanel.module.css";
import { useContext } from "react";
import { AppStateContext } from "../../state/AppProvider";
import React from "react";
import ChatHistoryList from "./ChatHistoryList";
import { ChatHistoryLoadingState, historyDeleteAll } from "../../api";

interface ChatHistoryPanelProps {}

export enum ChatHistoryPanelTabs {
    History = "History"
}

const commandBarStyle: ICommandBarStyles = {
    root: {
        padding: '0',
        display: 'flex',
        justifyContent: 'center',
        backgroundColor: 'transparent'
    },
};

const commandBarButtonStyle: Partial<IStackStyles> = { root: { height: '50px' } };

export function ChatHistoryPanel(props: ChatHistoryPanelProps) {
    const appStateContext = useContext(AppStateContext);
    const [showContextualMenu, setShowContextualMenu] = React.useState(false);
    const [hideClearAllDialog, { toggle: toggleClearAllDialog }] = useBoolean(true);
    const [clearing, setClearing] = React.useState(false);
    const [clearingError, setClearingError] = React.useState(false);

    const clearAllDialogContentProps = {
        type: DialogType.close,
        title: !clearingError ? 'Are you sure you want to clear all chat history?' : 'Error deleting all of chat history',
        closeButtonAriaLabel: 'Close',
        subText: !clearingError ? 'All chat history will be permanently removed.' : 'Please try again. If the problem persists, please contact the site administrator.',
    };
    
    const modalProps = {
        titleAriaId: 'labelId',
        subtitleAriaId: 'subTextId',
        isBlocking: true,
        styles: { main: { maxWidth: 450 } },
    };

    const menuItems: IContextualMenuItem[] = [
        { key: 'clearAll', text: 'Clear all chat history', iconProps: { iconName: 'Delete' } },
    ];

    const handleHistoryClick = () => {
        appStateContext?.dispatch({ type: 'TOGGLE_CHAT_HISTORY' });
    };

    const onShowContextualMenu = React.useCallback((ev: React.MouseEvent<HTMLElement>) => {
        ev.preventDefault(); // don't navigate
        setShowContextualMenu(true);
    }, []);

    const onHideContextualMenu = React.useCallback(() => setShowContextualMenu(false), []);

    const onClearAllChatHistory = async () => {
        setClearing(true);
        let response = await historyDeleteAll();
        if (!response.ok) {
            setClearingError(true);
        } else {
            appStateContext?.dispatch({ type: 'DELETE_CHAT_HISTORY' });
            toggleClearAllDialog();
        }
        setClearing(false);
    };

    const onHideClearAllDialog = () => {
        toggleClearAllDialog();
        setTimeout(() => {
            setClearingError(false);
        }, 2000);
    };

    React.useEffect(() => {}, [appStateContext?.state.chatHistory, clearingError]);

    return (
        <section className={styles.container} data-is-scrollable aria-label="painel de histórico de bate-papo">
            <Stack horizontal horizontalAlign="space-between" verticalAlign="center" wrap aria-label="cabeçalho do histórico de bate-papo">
                <StackItem>
                    <Text role="heading" aria-level={2} style={{ alignSelf: "center", fontWeight: "600", fontSize: "18px", marginRight: "auto", paddingLeft: "20px" }}>Chat history</Text>
                </StackItem>
                <Stack verticalAlign="start">
                    <Stack horizontal styles={commandBarButtonStyle}>
                        {/* Substituição do botão More */}
                        <CommandBarButton
                            onClick={onShowContextualMenu}
                            aria-label="limpar todo o histórico de bate-papo"
                            styles={commandBarStyle}
                            role="button"
                            id="moreButton"
                        >
                            <FaEllipsisV size={18} />
                        </CommandBarButton>
                        <ContextualMenu
                            items={menuItems}
                            hidden={!showContextualMenu}
                            target="#moreButton"
                            onItemClick={toggleClearAllDialog}
                            onDismiss={onHideContextualMenu}
                        />
                        {/* Substituição do botão Cancel */}
                        <CommandBarButton
                            onClick={handleHistoryClick}
                            aria-label="botão ocultar"
                            styles={commandBarStyle}
                            role="button"
                        >
                            <FaTimes size={18} />
                        </CommandBarButton>
                    </Stack>
                </Stack>
            </Stack>
            <Stack
                aria-label="conteúdo do painel do histórico de bate-papo"
                styles={{
                    root: {
                        display: "flex",
                        flexGrow: 1,
                        flexDirection: "column",
                        paddingTop: "2.5px",
                        maxWidth: "100%",
                        flexWrap: "wrap",
                        padding: "1px",
                    },
                }}
            >
                <Stack className={styles.chatHistoryListContainer}>
                    {appStateContext?.state.chatHistoryLoadingState === ChatHistoryLoadingState.Success &&
                        appStateContext?.state.isCosmosDBAvailable.cosmosDB && <ChatHistoryList />}
                    {appStateContext?.state.chatHistoryLoadingState === ChatHistoryLoadingState.Fail &&
                        appStateContext?.state.isCosmosDBAvailable && (
                            <Stack horizontalAlign="center" verticalAlign="center" style={{ width: "100%", marginTop: 10 }}>
                                <StackItem>
                                    <Text style={{ alignSelf: 'center', fontWeight: '400', fontSize: 16 }}>
                                        {appStateContext?.state.isCosmosDBAvailable?.status ? (
                                            <span>{appStateContext?.state.isCosmosDBAvailable?.status}</span>
                                        ) : (
                                            <span>Error loading chat history</span>
                                        )}
                                    </Text>
                                </StackItem>
                                <StackItem>
                                    <Text style={{ alignSelf: 'center', fontWeight: '400', fontSize: 14 }}>
                                        <span>Chat history can't be saved at this time</span>
                                    </Text>
                                </StackItem>
                            </Stack>
                        )}
                    {appStateContext?.state.chatHistoryLoadingState === ChatHistoryLoadingState.Loading && (
                        <Stack horizontalAlign="center" verticalAlign="center" style={{ width: "100%", marginTop: 10 }}>
                            <StackItem>
                                <Spinner size={SpinnerSize.medium} />
                            </StackItem>
                            <StackItem>
                                <Text style={{ alignSelf: 'center', fontWeight: '400', fontSize: 14 }}>
                                    <span style={{ whiteSpace: 'pre-wrap' }}>Loading chat history</span>
                                </Text>
                            </StackItem>
                        </Stack>
                    )}
                </Stack>
            </Stack>
            <Dialog
                hidden={hideClearAllDialog}
                onDismiss={clearing ? () => {} : onHideClearAllDialog}
                dialogContentProps={clearAllDialogContentProps}
                modalProps={modalProps}
            >
                <DialogFooter>
                    {!clearingError && <PrimaryButton onClick={onClearAllChatHistory} disabled={clearing} text="Clear All" />}
                    <DefaultButton onClick={onHideClearAllDialog} disabled={clearing} text={!clearingError ? "Cancel" : "Close"} />
                </DialogFooter>
            </Dialog>
        </section>
    );
}
