import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
  } from "@/components/ui/dialog";
  import { Button } from "@/components/ui/button";
  import { useNavigate } from "react-router-dom";
  
  export default function LocationModal() {
    const navigate = useNavigate();
  
    return (
        <Dialog defaultOpen modal>
            <DialogContent>
            <DialogHeader>
                <DialogTitle>Location Required</DialogTitle>
                <DialogDescription>
                To access the leaderboard and map, you need to set your
                location in your profile.
                </DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button onClick={() => navigate("/profile")}>
                Go to Profile
                </Button>
            </DialogFooter>
            </DialogContent>
      </Dialog>
    );
  }
  