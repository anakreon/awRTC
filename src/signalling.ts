interface AwEvent {}

interface AwEventFromPeer extends AwEvent {
    peerId: string;
}

export interface AwOfferEvent extends AwEventFromPeer {
    offer: RTCSessionDescription;
}

export interface AwAnswerEvent extends AwEventFromPeer {
    answer: RTCSessionDescription;
}

export interface AwNewCandidateEvent extends AwEventFromPeer {
    iceCandidate: RTCIceCandidate;
}

export interface AwPeerListEvent extends AwEvent {
    peerList: string[];
}

type AwEventName = 'offer' | 'answer' | 'newCandidate' | 'peerList';

type AwEventHandler<T> = (event: T) => void;

export abstract class Signalling {
    private eventHandlers: { [eventName: string]: AwEventHandler<AwEvent>[] }

    public abstract registerPeer (peerId: string): void;
    public abstract sendOfferToRemotePeer (peerId: string, offer: RTCSessionDescriptionInit): void;
    public abstract sendAnswerToRemotePeer (peerId: string, answer: RTCSessionDescriptionInit): void;
    public abstract sendNewCandidateToRemotePeer (peerId: string, candidate: RTCIceCandidate): void;

    public on (eventName: 'offer', handlerCallback: AwEventHandler<AwOfferEvent>);
    public on (eventName: 'answer', handlerCallback: AwEventHandler<AwAnswerEvent>);
    public on (eventName: 'newCandidate', handlerCallback: AwEventHandler<AwNewCandidateEvent>);
    public on (eventName: 'peerList', handlerCallback: AwEventHandler<AwPeerListEvent>);
    public on (eventName: AwEventName, handlerCallback: AwEventHandler<any>) {
        this.eventHandlers[eventName] = this.eventHandlers[eventName] || [];
        this.eventHandlers[eventName].push(handlerCallback);
    }

    protected dispatch (eventName: AwEventName, event: AwEvent): void {
        this.eventHandlers[eventName].forEach((handlerCallback) => handlerCallback(event));
    }
}