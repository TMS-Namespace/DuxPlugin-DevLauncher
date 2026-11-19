// NeoVimProvider.qml - Expose the NeoVim history reader through the shared provider boundary.
import ".."
import "../../../../Plugin/QML/Contracts"
// Rules: Declares only the reader component for NeoVim; it reads no history and imports only its own folder and the shared contracts.
import QtQml

// Declares the reader component that the facade creates on first use.
ProviderBase {

    readerType: Component {
        NeoVimRecents {
        }

    }

}
