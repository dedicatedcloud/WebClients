import type { KeyboardEvent, MutableRefObject } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { c } from 'ttag';

import { Button, Tooltip } from '@proton/atoms';
import type { IconName } from '@proton/components';
import { Icon, InputFieldTwo, useActiveBreakpoint } from '@proton/components';
import TextArea from '@proton/components/components/v2/input/TextArea';
import { ASSISTANT_PROMPT_SIZE_LIMIT } from '@proton/llm/lib';

import type { ComposerAssistantSelection } from 'proton-mail/hooks/assistant/useComposerAssistantSelectedText';

interface Props {
    isAssistantExpanded?: boolean;
    selection: ComposerAssistantSelection;
    prompt: string;
    setPrompt: (value: string) => void;
    previousPrompt: MutableRefObject<string>;
    onSubmit: () => void;
    disabled?: boolean;
    onCloseSpotlight: () => void;
}

const ComposerAssistantCustomInput = ({
    isAssistantExpanded,
    selection,
    prompt,
    setPrompt,
    previousPrompt,
    onSubmit,
    disabled,
    onCloseSpotlight,
}: Props) => {
    const [showPopover, setShowPopover] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);

    const { buttonText, buttonIconName }: { buttonText: string; buttonIconName: IconName } = useMemo(() => {
        let buttonText = c('Action').t`Write for me`;
        let buttonIconName: IconName = 'pen-sparks';

        if (isAssistantExpanded) {
            buttonText = c('Action').t`Modify`;
        }

        // If some content is selected in the composer, assistant is expanded, and no text is selected in the generation,
        // we should show "Modify selection" since no text is selected at this stage.
        const hasSelectedTextInComposer = !!selection.composerSelectedText && !isAssistantExpanded;
        if (hasSelectedTextInComposer || !!selection.generationSelectedText) {
            buttonIconName = 'text-quote-filled';
            buttonText = c('Action').t`Modify selection`;
        }

        return { buttonText, buttonIconName };
    }, [isAssistantExpanded, selection.composerSelectedText, selection.generationSelectedText]);

    const selectedTextToDisplay = useMemo(() => {
        return isAssistantExpanded ? selection.generationSelectedText : selection.composerSelectedText;
    }, [selection.composerSelectedText, selection.generationSelectedText, isAssistantExpanded]);

    const { viewportWidth } = useActiveBreakpoint();

    const randomPlaceholder = useMemo(() => {
        const placeholderPrompts = [
            c('Placeholder').t`Tell the writing assistant what to write. Example: “Invite Jane to my party”`,
            c('Placeholder')
                .t`Tell the writing assistant what to write. Example: “Announce upcoming events in a newsletter”`,
            c('Placeholder')
                .t`Tell the writing assistant what to write. Example: “Write a cover letter for an internship”`,
            c('Placeholder').t`Tell the writing assistant what to write. Example: “Cancel my gym membership”`,
            c('Placeholder')
                .t`Tell the writing assistant what to write. Example: “Write a follow-up email to a client”`,
            c('Placeholder')
                .t`Tell the writing assistant what to write. Example: “Thank my coworker for help on a project”`,
        ];

        return placeholderPrompts[Math.floor(Math.random() * placeholderPrompts.length)];
    }, []);

    const handleSubmit = async () => {
        onSubmit();
        previousPrompt.current = prompt;
        setShowPopover(false);
    };

    const handleKeyDown = async (event: KeyboardEvent<HTMLTextAreaElement>) => {
        // Block the submit action when there is no prompt in the input
        if (event.key === 'Enter' && !event.shiftKey && prompt !== '') {
            event.preventDefault();
            await handleSubmit();
        }
    };

    // Close the popover when clicking outside custom input
    useEffect(() => {
        const handleClick = (e: any) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setShowPopover(false);
            }
        };

        document.addEventListener('click', handleClick);

        return () => {
            document.removeEventListener('click', handleClick);
        };
    }, []);

    const handleClickToggle = () => {
        // Previous prompt ref should be reset when closing the assistant or inserting a result.
        // However, when closing the assistant using a shortcut, it's not.
        // Composer hotkeys are managed higher (useComposerContent), and from there we cannot reset the ref.
        // So before opening the popover, if the assistant is not expanded, reset it
        if (!isAssistantExpanded) {
            previousPrompt.current = '';
        }

        // Before opening the input popover, we want to pre-fill the input with the original prompt
        if (!showPopover && previousPrompt.current) {
            setPrompt(previousPrompt.current);
        }
        setShowPopover(!showPopover);
        onCloseSpotlight();
    };

    return (
        <div className="flex items-stretch" ref={containerRef}>
            <Button
                onClick={handleClickToggle}
                shape="ghost"
                className="mr-1 flex flex-nowrap flex-row items-center composer-assistant-refine-button"
                size="small"
                disabled={disabled}
            >
                <Icon name={buttonIconName} className="composer-assistant-special-color mr-1" />
                {buttonText}
            </Button>
            {showPopover && (
                <div className="absolute composer-assistant-refine-popover rounded-lg border border-weak bg-norm p-4 pt-3 flex flex-column flex-nowrap shadow-raised items-start">
                    {selectedTextToDisplay && (
                        <div className="text-ellipsis pb-2 color-weak w-full text-sm border-bottom border-weak mb-1">
                            {selectedTextToDisplay}
                        </div>
                    )}

                    <InputFieldTwo
                        as={TextArea}
                        autoFocus
                        value={prompt}
                        placeholder={
                            !!selection.composerSelectedText || isAssistantExpanded
                                ? c('Placeholder').t`Describe what to change`
                                : randomPlaceholder
                        }
                        onValue={(value: string) => {
                            setPrompt(value);
                        }}
                        onKeyDown={handleKeyDown}
                        data-testid="composer:genie"
                        autoGrow
                        minRows={viewportWidth['<=small'] ? 5 : 3}
                        unstyled
                        dense
                        className="rounded-none composer-assistant-input pt-1 pb-0 resize-none"
                        aria-describedby="composer-assistant-refine-popover composer-assistant-hint"
                        maxLength={ASSISTANT_PROMPT_SIZE_LIMIT}
                    />

                    <Tooltip title={c('Info').t`Generate text`}>
                        <Button
                            icon
                            shape="ghost"
                            color="weak"
                            size="small"
                            disabled={prompt === ''}
                            onClick={handleSubmit}
                            className="ml-auto"
                        >
                            <Icon
                                name="arrow-left-and-up"
                                className="rotateZ-270 composer-assistant-special-color"
                                alt={c('Action').t`Generate text`}
                            />
                        </Button>
                    </Tooltip>
                </div>
            )}
        </div>
    );
};

export default ComposerAssistantCustomInput;
